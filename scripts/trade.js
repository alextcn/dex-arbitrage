
const { runApp, addressEquals, logBalance } = require("./utils")
const cfg = require('../config.json')
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")
const { getPairPrice, getPairContract, priceDiffPercent } = require("./uni-utils")
const { logBlock, timeTag, getAmountIn, maxTradeProfit } = require("./trade-utils")


// deployed FlashSwap.sol contract
const flashswapAddress = '0x70e0bA845a1A0F2DA3359C97E0285013525FFC49'
const dexToRouterAddress = cfg.sushiRouter

const tokenAddressA = cfg.DAI
const tokenAddressB = cfg.WETH


// TODO: calculate ideal trade size

// Calculates amount of tokens to borrow on Uniswap to swap on Sushiswap.
// Returns amount of token B if Uniswap price of token B is larger,
// otherwise amount of token A.
//
// Trade size is half of price impact to move uni price down to sushi price.
function calcTradeSize(uniPrice, sushiPrice) {
    const precision = 18 // TODO: use token decimals?
    const d = BigNumber.from(10).pow(precision)

    // price_diff(u, s) = (1000 * (u.reserve_a * s.reserve_b) / (u.reserve_b * s.reserve_a)) - 1000
    const priceDiff = d.mul(uniPrice.reserveA).mul(sushiPrice.reserveB).div(uniPrice.reserveB).div(sushiPrice.reserveA).sub(d)
    // console.log(`price diff = ${ethers.utils.formatUnits(priceDiff, precision)}%`)

    // order_size(PI%) ~= (pool_size * PI%) / 2
    if (priceDiff.gte(0)) {
        return { amountBorrowA: uniPrice.reserveA.mul(priceDiff).div(2).div(d).div(2) }
    } else {
        return { amountBorrowB: uniPrice.reserveB.mul(-1).mul(priceDiff).div(2).div(d).div(2) }
    }
}

// Flashswap by borrowing amountBorrowDAI DAI on Uniswap, 
// swapping it for WETH required to return a loan,
// and sending rest of DAI to a sender
async function flashswap(uniPair, tokenBorrowAddress, amountBorrow) {
    // prepare args
    const amount0 = addressEquals(await uniPair.token0(), tokenBorrowAddress) ? amountBorrow : BigNumber.from(0)
    const amount1 = addressEquals(await uniPair.token1(), tokenBorrowAddress) ? amountBorrow : BigNumber.from(0)
    const data = ethers.utils.defaultAbiCoder.encode(['address'], [dexToRouterAddress])

    // swap
    try {
        const tx = await uniPair.swap(amount0, amount1, flashswapAddress, data)
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

    const uniPair = await getPairContract(cfg.uniFactory, tokenAddressA, tokenAddressB)
    const sushiPair = await getPairContract(cfg.sushiFactory, tokenAddressA, tokenAddressB)

    // TODO: get sorted from uni pair contract
    const tokenSymbolA = 'DAI'
    const tokenSymbolB = 'WETH'

    var isSwapping = false

    var checkPrices = async function (blockNumber) {
        if (isSwapping) return
    
        const uniPrice = await getPairPrice(uniPair)
        const sushiPrice = await getPairPrice(sushiPair)
        const priceDiff = priceDiffPercent(uniPrice, sushiPrice)
        logBlock(blockNumber, uniPrice, sushiPrice, priceDiff)
    
        // calc how much DAI should be borrowed on Uniswap to balance Uniswap and Sushiswap prices
        const trade = calcTradeSize(uniPrice, sushiPrice)
        const amountBorrow = trade.amountBorrowA ? trade.amountBorrowA : trade.amountBorrowB
        const tokenBorrowAddress = trade.amountBorrowA ? tokenAddressA : tokenAddressB
        const tokenBorrowSymbol = trade.amountBorrowA ? tokenSymbolA : tokenSymbolB
        if (amountBorrow.gte(0)) {
            // calculate max possible profit
            const maxProfit = maxTradeProfit(uniPrice, sushiPrice, trade.amountBorrowA, trade.amountBorrowB)
            console.log(`- amount_borrow=${ethers.utils.formatUnits(amountBorrow, 18)} ${tokenBorrowSymbol}, max_profit=${ethers.utils.formatUnits(maxProfit, 18)} ${tokenBorrowSymbol}`)

            // swap if Uniswap price is higher than Sushiswap and there is an opportunity for profit
            if (maxProfit.gte(0)) {
                isSwapping = true
                console.log(`\n[flashswap] execute flashswap by borrowing ${ethers.utils.formatUnits(amountBorrow, 18)} ${tokenBorrowSymbol} on Uniswap...`)
                const success = await flashswap(uniPair, tokenBorrowAddress, amountBorrow)
                if (success) {
                    await logBalance(senderAddress, tokenAddressA, tokenAddressB)
                    process.exit(0) // turn the app off on successs
                }
                isSwapping = false
            }
        }        
    }

    ethers.provider.on('block', checkPrices)
}

runApp(main)