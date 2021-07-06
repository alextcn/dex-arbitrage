
const { runApp, addressEquals, logBalance } = require("./utils")
const cfg = require('../config.json')
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")
const { getPairPrice, getPairContract, priceDiffPercent, tokenInfo } = require("./uni-utils")
const { logBlock, createTrade, flashswapProfit } = require("./trade-utils")

// deployed FlashSwap.sol contract
const flashswapAddress = '0x70e0bA845a1A0F2DA3359C97E0285013525FFC49'
const tokenAAddress = cfg.USDC
const tokenBAddress = cfg.LINK

const dex0 = {
    name: "Uniswap",
    factory: cfg.uni.factory,
    router: cfg.uni.router
}
const dex1 = {
    name: "Sushiswap",
    factory: cfg.sushi.factory,
    router: cfg.sushi.router
}


// Flashswaps by borrowing amountBorrow of borrowTokenAddress on dex0, 
// swapping it for another token required to return a loan on dex1,
// and sending the rest of borrowed token to a sender.
async function flashswap(pair, borrowTokenAddress, amountBorrow) {
    const amount0 = addressEquals(await pair.token0(), borrowTokenAddress) ? amountBorrow : BigNumber.from(0)
    const amount1 = addressEquals(await pair.token1(), borrowTokenAddress) ? amountBorrow : BigNumber.from(0)
    const data = ethers.utils.defaultAbiCoder.encode(['address'], [dex1.router])

    try {
        console.log(`\n[flashswap] executing flashswap...`)
        const tx = await pair.swap(amount0, amount1, flashswapAddress, data)
        const receipt = await tx.wait()
        console.log(`[flashswap] flashswap success: blockNumber = ${receipt.blockNumber}, status = ${receipt.status}, tx = ${receipt.transactionHash}, gasUsed = ${receipt.gasUsed.toString()}\n`)
        return true
    } catch (error) {
        console.log(`[flashswap] flashswap failed: ${error}\n`)
        return false
    }
}

async function main() {
    const senderAddress = await (await ethers.provider.getSigner()).getAddress()

    const pair0 = await getPairContract(dex0.factory, tokenAAddress, tokenBAddress)
    const pair1 = await getPairContract(dex1.factory, tokenAAddress, tokenBAddress)
    if (pair0.address == 0 || pair1.address == 0) {
        console.error('No pairs for given tokens')
        process.exit(1)
    }

    // get sorted from uniswap pair contract
    const tokenAInfo = await tokenInfo(await pair0.token0())
    const tokenBInfo = await tokenInfo(await pair0.token1())

    var isSwapping = false

    var checkPrices = async function (blockNumber) {
        if (isSwapping) return
    
        // TODO: make more accurate precision
        const price0 = await getPairPrice(pair0)
        const price1 = await getPairPrice(pair1)
        const priceDiff = priceDiffPercent(price0, price1)
        logBlock(blockNumber, tokenAInfo, tokenBInfo, price0, price1, priceDiff)
    
        // calc how much token should be borrowed to balance prices between two DEXes
        const trade = createTrade(price0, price1)
        const amountBorrow = trade.amountBorrowA ? trade.amountBorrowA : trade.amountBorrowB
        const tokenBorrowInfo = trade.amountBorrowA ? tokenAInfo : tokenBInfo

        // calculate max potential profit by flashswapping amountBorrow tokens
        const maxProfit = flashswapProfit(price0, price1, trade.amountBorrowA, trade.amountBorrowB)
        console.log(`- amount_borrow=${tokenBorrowInfo.format(amountBorrow, true)}, max_profit=${tokenBorrowInfo.format(maxProfit, true)}`)

        // swap if Uniswap price is higher than Sushiswap and there is an opportunity for profit
        if (maxProfit.gte(0)) {
            isSwapping = true
            const success = await flashswap(pair0, tokenBorrowInfo.address, amountBorrow)
            if (success) {
                await logBalance(senderAddress, tokenAInfo.address, tokenBInfo.address)
                process.exit(0) // turn the app off on successs
            }
            isSwapping = false
        }        
    }

    ethers.provider.on('block', checkPrices)
}

runApp(main)