
const { BigNumber } = require("ethers")

// Returns a required input amount of the other asset, 
// given an output amount of an asset and pair reserves.
function getAmountIn(amountOut, reserveIn, reserveOut) {
    const numerator = reserveIn.mul(amountOut).mul(1000)
    const denominator = reserveOut.sub(amountOut).mul(997)
    return numerator.div(denominator).add(1)
}

// TODO: calculate ideal trade size
// Calculates amount of tokens to borrow on Uniswap to swap on Sushiswap.
// Returns amount of token B if Uniswap price of token B is larger,
// otherwise amount of token A.
//
// Trade size is half of price impact to move uni price down to sushi price.
function createTrade(price0, price1) {
    const precision = 18 // TODO: use token decimals?
    const d = BigNumber.from(10).pow(precision)

    // price_diff(u, s) = (1000 * (u.reserve_a * s.reserve_b) / (u.reserve_b * s.reserve_a)) - 1000
    const priceDiff = d.mul(price0.reserveA).mul(price1.reserveB).div(price0.reserveB).div(price1.reserveA).sub(d)
    // console.log(`price diff = ${ethers.utils.formatUnits(priceDiff, precision)}%`)

    // order_size(PI%) ~= (pool_size * PI%) / 2
    if (priceDiff.gte(0)) {
        return { amountBorrowA: price0.reserveA.mul(priceDiff).div(2).div(d).div(2) }
    } else {
        return { amountBorrowB: price0.reserveB.mul(-1).mul(priceDiff).div(2).div(d).div(2) }
    }
}

// Returns maximum potential profit of flashswap: borrowing amountBorrow tokens on DEX0,
// swapping it on another tokens on DEX1 to return debt, and leaving rest of borrowed tokens as a profit.
// Actual profit could be different due to frontrunning.
function flashswapProfit(price0, price1, amountBorrowA, amountBorrowB) {
    if (amountBorrowA) {
        const amountRequiredB = getAmountIn(amountBorrowA, price0.reserveB, price0.reserveA)
        const minSwapAmountIn = getAmountIn(amountRequiredB, price1.reserveA, price1.reserveB)
        return amountBorrowA.sub(minSwapAmountIn)
    } else {
        const amountRequiredA = getAmountIn(amountBorrowB, price0.reserveA, price0.reserveB)
        const minSwapAmountIn = getAmountIn(amountRequiredA, price1.reserveB, price1.reserveA)
        return amountBorrowB.sub(minSwapAmountIn)
    }
}

function logBlock(blockNumber, tokenAInfo, tokenBInfo, price0, price1, priceDiff) {
    const date = new Date()
    const timeTag = `${date.toLocaleTimeString('en-US', { hour12: false })}:${date.getMilliseconds()}`
    console.log(`${timeTag} #${blockNumber} [${tokenAInfo.symbol}/${tokenBInfo.symbol}]`)

    console.log(`- uni=${price0.priceBFormatted}, sushi=${price1.priceBFormatted}, diff=${priceDiff}%`)
    console.log(`- uni_reserves=(${tokenAInfo.format(price0.reserveA)}, ${tokenBInfo.format(price0.reserveB)})`)
    console.log(`- sushi_reserves=(${tokenAInfo.format(price1.reserveA)}, ${tokenBInfo.format(price1.reserveB)})`)
}

module.exports = {
    getAmountIn,
    createTrade,
    flashswapProfit,
    logBlock
}