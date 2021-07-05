
const cfg = require("../config.json")
const { printPairPrice } = require("./uni-utils")
const { runScript, logBalance } = require("./utils")

const factoryAddress = cfg.uniFactory
const routerAddress = cfg.uniRouter
const holderAddress = '0x82810e81cad10b8032d39758c8dba3ba47ad7092'

const tokenInAddress = cfg.DAI
const tokenOutAddress = cfg.WETH
const amount = '500000'

runScript(async function () {
    await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [holderAddress] })
    const signer = await ethers.provider.getSigner(holderAddress)
    // await logBalance(holderAddress, tokenInAddress, tokenOutAddress)

    const uniRouter = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol:IUniswapV2Router02', routerAddress)
    const tokenIn = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', tokenInAddress)
    const tokenOut = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', tokenOutAddress)
    
    const decimalsIn = await tokenIn.decimals()
    const amountIn = ethers.utils.parseUnits(amount, decimalsIn)
    const path = [tokenInAddress, tokenOutAddress]
    const blockNumber = await ethers.provider.getBlockNumber()
    const deadline = (await ethers.provider.getBlock(blockNumber)).timestamp + (60 * 60)

    try {
        console.log(`Swapping ${ethers.utils.formatUnits(amountIn, decimalsIn)} ${await tokenIn.symbol()} for ${await tokenOut.symbol()} by ${holderAddress}...`)
        // approve router to spend tokens
        await (await tokenIn.connect(signer).approve(routerAddress, amountIn)).wait()
        // swap
        const tx = await uniRouter.connect(signer).swapExactTokensForTokens(amountIn, 0, path, holderAddress, deadline)
        await tx.wait()
        console.log(`Swap succeeded!`)
        await printPairPrice(factoryAddress, tokenOutAddress, tokenInAddress)
    } catch (error) {
        console.log(`Swap failed: ${error}`)
        await logBalance(holderAddress, tokenInAddress, tokenOutAddress)
    }
})