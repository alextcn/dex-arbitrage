
const { runApp, addressEquals, logBalance } = require("./utils")
const cfg = require('../config.json')
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")
const { getPairPrice, getPairContract, priceDiffPercent } = require("./uni-utils")
const { logBlock, timeTag, getAmountIn, maxTradeProfit } = require("./trade-utils")


// TODO: calculate ideal trade size
// Calculates trade size of selling token B on Uniswap and buying on Sushiswap.
// Trade size is half of price impact to move uni price down to sushi price.
function calcTradeSize(uniPrice, sushiPrice) {
    const precision = 4
    const d = BigNumber.from(10).pow(precision)

    // price_diff(u, s) = (1000 * (u.reserve_a * s.reserve_b) / (u.reserve_b * s.reserve_a)) - 1000
    const priceDiff = d.mul(uniPrice.reserveA).mul(sushiPrice.reserveB).div(uniPrice.reserveB).div(sushiPrice.reserveA).sub(d)
    // order_size(PI%) ~= (pool_size * PI%) / 2
    // return half of that order size to compensate price impact on sushiswap
    return uniPrice.reserveA.mul(priceDiff).div(2).div(2).div(d)
}

// Flashswap by borrowing amountBorrowDAI DAI on Uniswap, 
// swapping it for WETH required to return a loan,
// and sending rest of DAI to a sender
async function flashswap(uniPair, flashswapAddress, amountBorrowDAI) {
    console.log(`\n[flashswap] execute flashswap by borrowing ${ethers.utils.formatUnits(amountBorrowDAI, 18)} DAI on Uniswap...`)

    // prepare args
    const amount0 = addressEquals(await uniPair.token0(), cfg.DAI) ? amountBorrowDAI : BigNumber.from(0)
    const amount1 = addressEquals(await uniPair.token1(), cfg.DAI) ? amountBorrowDAI : BigNumber.from(0)
    const data = ethers.utils.randomBytes(2) // non-zero length random bytes are ok?

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
    // deployed uni_borrow -> sushi_swap FlashSwap.sol contract
    const flashswapAddress = '0x4826533B4897376654Bb4d4AD88B7faFD0C98528'
    const senderAddress = await (await ethers.provider.getSigner()).getAddress()

    const uniPair = await getPairContract(cfg.uniFactory, cfg.WETH, cfg.DAI)
    const sushiPair = await getPairContract(cfg.sushiFactory, cfg.WETH, cfg.DAI)

    var isSwapping = false

    var checkPrices = async function (blockNumber) {
        if (isSwapping) return
    
        const uniPrice = await getPairPrice(uniPair)
        const sushiPrice = await getPairPrice(sushiPair)
        const priceDiff = priceDiffPercent(uniPrice, sushiPrice)
        logBlock(blockNumber, uniPrice, sushiPrice, priceDiff)
    
        // calc how much DAI should be borrowed on Uniswap to balance Uniswap and Sushiswap prices
        const amountBorrowDAI = calcTradeSize(uniPrice, sushiPrice)
        if (amountBorrowDAI.gte(0)) {
            // calculate max possible profit
            const maxProfit = maxTradeProfit(uniPrice, sushiPrice, amountBorrowDAI)
            console.log(`- trade_size=${ethers.utils.formatUnits(amountBorrowDAI, 18)} DAI, max_profit=${ethers.utils.formatUnits(maxProfit, 18)} DAI`)
            
            // swap if Uniswap price is higher than Sushiswap and there is an opportunity for profit
            if (maxProfit.gte(0)) {
                isSwapping = true
                console.log(`[flashswap] max profit = ${ethers.utils.formatUnits(maxProfit, 18)} DAI`)
                const success = await flashswap(uniPair, flashswapAddress, amountBorrowDAI)
                if (success) {
                    await logBalance(senderAddress, cfg.WETH, cfg.DAI)
                    process.exit(0) // turn the app off on successs
                }
                isSwapping = false
            }
        }        
    }

    ethers.provider.on('block', checkPrices)
}

runApp(main)