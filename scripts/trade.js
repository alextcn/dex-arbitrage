
const { runApp, addressEquals, logBalance } = require("./utils")
const cfg = require('../config.json')
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")
const { getPairContract, tokenInfo } = require("./uni-utils")
const { logBlock, createTrade, flashswapProfit } = require("./trade-utils")

// deployed FlashSwap.sol contract
const flashswapAddress = '0x70e0ba845a1a0f2da3359c97e0285013525ffc49'
const routeAddresses = [
    // WETH
    [cfg.WETH, cfg.USDT],
    [cfg.WETH, cfg.USDC],
    [cfg.WETH, cfg.DAI],
    [cfg.WETH, cfg.WBTC],
    // WBTC
    // [cfg.WBTC, cfg.USDT], // empty pool on sushi
    // [cfg.WBTC, cfg.USDC], // no pair on sushi
    // [cfg.WBTC, cfg.DAI], // no pair on sushi
    // other
    // [cfg.FNK, cfg.USDT], // no pair on sushi
    // [cfg.FEI, cfg.WETH], // no pair on sushi    
    [cfg.SHIB, cfg.WETH],
    [cfg.UNI, cfg.WETH],
    // [cfg.SAND, cfg.WETH], // no pair on sushi
    [cfg.AAVE, cfg.WETH],
    [cfg.LINK, cfg.WETH],
    [cfg.SNX, cfg.WETH],
    [cfg.CRV, cfg.WETH],
    [cfg.COMP, cfg.WETH]
]
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

var senderAddress
var isSwapping = false


// Flashswaps by borrowing amountBorrow of borrowTokenAddress on dex0, 
// swapping it for another token required to return a loan on dex1,
// and sending the rest of borrowed token to a sender.
async function flashswap(pair, borrowTokenAddress, amountBorrow) {
    const amount0 = addressEquals(await pair.token0(), borrowTokenAddress) ? amountBorrow : BigNumber.from(0)
    const amount1 = addressEquals(await pair.token1(), borrowTokenAddress) ? amountBorrow : BigNumber.from(0)
    const data = ethers.utils.defaultAbiCoder.encode(['address'], [dex1.router])

    try {
        console.log(`\n[flashswap] executing flashswap...`)
        const receipt = await (await pair.swap(amount0, amount1, flashswapAddress, data)).wait()
        console.log(`[flashswap] flashswap success: blockNumber = ${receipt.blockNumber}, status = ${receipt.status}, tx = ${receipt.transactionHash}, gasUsed = ${receipt.gasUsed.toString()}\n`)
        return true
    } catch (error) {
        console.log(`[flashswap] flashswap failed: ${error}\n`)
        return false
    }
}

async function checkRoute(blockNumber, route) {
    const reserves0 = await route.pair0.getReserves()
    const reserves1 = await route.pair1.getReserves()
    
    // calc how much token should be borrowed to balance prices between two DEXes
    const trade = createTrade(reserves0, reserves1)
    const amountBorrow = trade.amountBorrowA ? trade.amountBorrowA : trade.amountBorrowB
    const tokenBorrowInfo = trade.amountBorrowA ? route.tokenAInfo : route.tokenBInfo
    
    // calculate max potential profit by flashswapping amountBorrow tokens
    const maxProfit = flashswapProfit(reserves0, reserves1, trade.amountBorrowA, trade.amountBorrowB)
    
    logBlock(blockNumber, dex0, dex1, route.tokenAInfo, route.tokenBInfo, reserves0, reserves1, tokenBorrowInfo, amountBorrow, maxProfit, true)
    
    // swap if Uniswap price is higher than Sushiswap and there is an opportunity for profit
    if (maxProfit.gte(0) && !isSwapping) {
        isSwapping = true
        const success = await flashswap(route.pair0, tokenBorrowInfo.address, amountBorrow)
        isSwapping = false
        if (success) {
            await logBalance(senderAddress, route.tokenAInfo.address, route.tokenBInfo.address)
        }
    }      
}

async function buildRoute(tokenAAddress, tokenBAddress) {
    const pair0 = await getPairContract(dex0.factory, tokenAAddress, tokenBAddress)
    const pair1 = await getPairContract(dex1.factory, tokenAAddress, tokenBAddress)
    if (pair0.address == 0 || pair1.address == 0) {
        console.error(`No pair for route [${tokenAAddress}, ${tokenBAddress}]: dex0 = ${pair0.address}, dex1 = ${pair1.address}`)
        process.exit(1)
    }

    // get sorted from uniswap pair contract
    const tokenAInfo = await tokenInfo(await pair0.token0())
    const tokenBInfo = await tokenInfo(await pair0.token1())

    return {
        tokenAInfo: tokenAInfo,
        tokenBInfo: tokenBInfo,
        pair0: pair0,
        pair1: pair1
    }
}


async function main() {
    senderAddress = await (await ethers.provider.getSigner()).getAddress()

    const routes = []
    for (var i = 0; i < routeAddresses.length; i++) {
        const [tokenAAddress, tokenBAddress] = routeAddresses[i]
        const route = await buildRoute(tokenAAddress, tokenBAddress)
        routes.push(route)
        console.log(`route[${i}]: [${route.tokenAInfo.symbol}/${route.tokenBInfo.symbol}]`)
    }

    ethers.provider.on('block', async function (blockNumber) {
        routes.forEach(route => checkRoute(blockNumber, route)) 
    })
}

runApp(main)