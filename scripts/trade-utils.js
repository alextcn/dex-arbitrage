
const { BigNumber } = require("ethers")
const { diffPercent, reservesToPrice } = require("./uni-utils")

// Returns a required input amount of the other asset, 
// given an output amount of an asset and pair reserves.
function getAmountIn(amountOut, reserveIn, reserveOut) {
    const numerator = reserveIn.mul(amountOut).mul(1000)
    const denominator = reserveOut.sub(amountOut).mul(997)
    return numerator.div(denominator).add(1)
}

// TODO: calculate ideal trade size
// TODO: support min value
// Calculates amount of tokens to borrow on Uniswap to swap on Sushiswap.
// Returns amount of token B if Uniswap price of token B is larger,
// otherwise amount of token A.
//
// Trade size is half of price impact to move uni price down to sushi price.
function createTrade(reserves0, reserves1) {
    const precision = 18 // TODO: use token decimals?
    const d = BigNumber.from('10').pow(precision)

    // price_diff(u, s) = (1000 * (u.reserve_a * s.reserve_b) / (u.reserve_b * s.reserve_a)) - 1000
    const priceDiff = d.mul(reserves0[0]).mul(reserves1[1]).div(reserves0[1]).div(reserves1[0]).sub(d)
    // console.log(`price diff = ${ethers.utils.formatUnits(priceDiff, precision)}%`)

    // order_size(PI%) ~= (pool_size * PI%) / 2
    if (priceDiff.gte(0)) {
        return { amountBorrowA: reserves0[0].mul(priceDiff).div(2).div(d).div(2) }
    } else {
        return { amountBorrowB: reserves0[1].mul(-1).mul(priceDiff).div(2).div(d).div(2) }
    }
}

// Returns maximum potential profit of flashswap: borrowing amountBorrow tokens on DEX0,
// swapping it on another tokens on DEX1 to return debt, and leaving rest of borrowed tokens as a profit.
// Actual profit could be different due to frontrunning.
function flashswapProfit(reserves0, reserves1, amountBorrowA, amountBorrowB) {
    if (amountBorrowA) {
        const amountRequiredB = getAmountIn(amountBorrowA, reserves0[1], reserves0[0])
        const minSwapAmountIn = getAmountIn(amountRequiredB, reserves1[0], reserves1[1])
        return amountBorrowA.sub(minSwapAmountIn)
    } else {
        const amountRequiredA = getAmountIn(amountBorrowB, reserves0[0], reserves0[1])
        const minSwapAmountIn = getAmountIn(amountRequiredA, reserves1[1], reserves1[0])
        return amountBorrowB.sub(minSwapAmountIn)
    }
}

function logBlock(blockNumber, dex0, dex1, tokenAInfo, tokenBInfo, reserves0, reserves1, tokenBorrowInfo, amountBorrow, maxProfit, oneline) {
    const date = new Date()
    const timeTag = `${date.toLocaleTimeString('en-US', { hour12: false })}:${date.getMilliseconds()}`

    const price0 = reservesToPrice(reserves0[0], reserves0[1], tokenAInfo.decimals, tokenBInfo.decimals)
    const price1 = reservesToPrice(reserves1[0], reserves1[1], tokenAInfo.decimals, tokenBInfo.decimals)
    const priceDiff = diffPercent(price0.priceB, price1.priceB, 4)

    if (oneline) {
        console.log(`${timeTag} #${blockNumber} [${tokenAInfo.symbol}/${tokenBInfo.symbol}] ${dex0.name}=${tokenAInfo.format(price0.priceB)}, ${dex1.name}=${tokenAInfo.format(price1.priceB)}, diff=${priceDiff}%`)
    } else {
        console.log(`${timeTag} #${blockNumber} [${tokenAInfo.symbol}/${tokenBInfo.symbol}]`)
        console.log(`- ${dex0.name}=${tokenAInfo.format(price0.priceB)}, ${dex1.name}=${tokenAInfo.format(price1.priceB)}, diff=${priceDiff}%`)
        console.log(`- Reserves: ${dex0.name}=[${tokenAInfo.format(reserves0[0])}, ${tokenBInfo.format(reserves0[1])}], ${dex1.name}=[${tokenAInfo.format(reserves1[0])}, ${tokenBInfo.format(reserves1[1])}]`)
    }
    console.log(`                                   borrow=${tokenBorrowInfo.format(amountBorrow, true)}, profit=${tokenBorrowInfo.format(maxProfit, true)}`)
}

module.exports = {
    getAmountIn,
    createTrade,
    flashswapProfit,
    logBlock
}