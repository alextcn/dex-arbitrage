const { expect } = require("chai")
const { BigNumber } = require("ethers")
const utils = require("../scripts/utils")
const cfg = require('../config.json')

// this test passes only when there is arbitrage opportunity between Uniswap and Sushiswap
describe("FlashLoanSwap", function() {
    const tokenSellAddress = cfg.weth
    const tokenBuyAddress = cfg.dai
    const amount = '3.14159265'
    
    var contract
    var contractAddress
    var senderAddress
    var tokenSell
    var tokenBuy

    before(async function () {
        const FlashLoanSwap = await ethers.getContractFactory('FlashLoanSwap')
        console.log('Deploying FlashLoanSwap...')
        contract = await FlashLoanSwap.deploy(cfg.aaveProvider, cfg.uniRouter, cfg.sushiRouter)
        contractAddress = (await contract.deployed()).address
        console.log('FlashLoanSwap deployed to:', contractAddress)

        senderAddress = await (await ethers.provider.getSigner()).getAddress()

        tokenSell = await ethers.getContractAt('contracts/interfaces/IERC20.sol:IERC20', tokenSellAddress)
        tokenBuy = await ethers.getContractAt('contracts/interfaces/IERC20.sol:IERC20', tokenBuyAddress)
    })

    it('swap using Aave flashloan', async function () {
        await utils.logBalance(senderAddress, tokenSellAddress, tokenBuyAddress)
        console.log(`Swapping ${amount} ${await tokenSell.symbol()} for ${await tokenBuy.symbol()}...`)

        try {
            const a = ethers.utils.parseUnits(amount, await tokenSell.decimals())
            const tx = await contract.flashLoanSwap(tokenSellAddress, tokenBuyAddress, a)
            const receipt = await tx.wait()
            console.log(`Swap success: tx = ${receipt.transactionHash}`)
            await utils.logBalance(senderAddress, tokenSellAddress, tokenBuyAddress)
        } catch(error) {
            console.log(`Swap error: ${error}`)
        }

        expect(await tokenSell.balanceOf(contractAddress)).to.equals(0)
        expect(await tokenBuy.balanceOf(contractAddress)).to.equals(0)
        expect(await tokenBuy.balanceOf(senderAddress)).to.gt(0)

    })
})
