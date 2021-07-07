
const { BigNumber } = require("ethers")
const { diffPercent, reservesToPrice } = require("./uni-utils")


// TODO: check that trade size is larger than pool size
// Calculates amount of tokens to borrow on Uniswap to swap on Sushiswap.
// Returns amount of token B if Uniswap price of token B is larger,
// otherwise amount of token A. Trade size is half of required amount to 
// move less liquid market to more luquid market.
// 
// order_size(PI%) ~= (pool_size * PI%) / 2
function createTrade(reserves0, reserves1) {
    const precision = 18
    const d = BigNumber.from('10').pow(precision)

    // price0/price1
    const priceDiff = d.mul(reserves0[0]).mul(reserves1[1]).div(reserves0[1]).div(reserves1[0]).sub(d)

    var amountBorrowA
    var amountBorrowB
    
    // calc based on half of price impact of less liquid market
    if (reserves0[0].mul(reserves0[1]).lt(reserves1[0].mul(reserves1[1]))) {
        amountBorrowA = priceDiff.gte(0) ? reserves0[0].mul(priceDiff).div(2).div(d).div(2) : undefined
        amountBorrowB = priceDiff.gte(0) ? undefined : reserves0[1].mul(-1).mul(priceDiff).div(2).div(d).div(2)
    } else {
        amountBorrowA = priceDiff.gte(0) ? reserves1[0].mul(priceDiff).div(2).div(d).div(2) : undefined
        amountBorrowB = priceDiff.gte(0) ? undefined : reserves1[1].mul(-1).mul(priceDiff).div(2).div(d).div(2)
    }
    
    // check max borrow reserves
    if (amountBorrowA && amountBorrowA.gte(reserves0[0])) {
        amountBorrowA = reserves0[0]
    }
    if (amountBorrowB && amountBorrowB.gte(reserves0[1])) {
        amountBorrowB = reserves0[1]
    }

    return { amountBorrowA: amountBorrowA, amountBorrowB: amountBorrowB }
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

// Returns a required input amount of the other asset, 
// given an output amount of an asset and pair reserves.
function getAmountIn(amountOut, reserveIn, reserveOut) {
    const numerator = reserveIn.mul(amountOut).mul(1000)
    const denominator = reserveOut.sub(amountOut).mul(997)
    return numerator.div(denominator).add(1)
}

// Returns the maximum output amount of the other asset, 
// given an input amount of an asset and pair reserves.
function getAmountOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn.mul(997)
    const numerator = amountInWithFee.mul(reserveOut)
    const denominator = reserveIn.mul(1000).add(amountInWithFee)
    return amountOut = numerator.div(denominator)
}

function logBlock(blockNumber, dex0, dex1, tokenAInfo, tokenBInfo, reserves0, reserves1, tokenBorrowInfo, amountBorrow, profit, oneline) {
    const date = new Date()
    const timeTag = `${date.toLocaleTimeString('en-US', { hour12: false })}:${date.getMilliseconds()}`

    const price0 = reservesToPrice(reserves0[0], reserves0[1], tokenAInfo.decimals, tokenBInfo.decimals)
    const price1 = reservesToPrice(reserves1[0], reserves1[1], tokenAInfo.decimals, tokenBInfo.decimals)
    const priceDiff = diffPercent(price0.priceB, price1.priceB, 4)

    if (oneline) {
        var log = `${timeTag} #${blockNumber} [${tokenAInfo.symbol}/${tokenBInfo.symbol}] ${dex0.name}=${tokenAInfo.format(price0.priceB)}, ${dex1.name}=${tokenAInfo.format(price1.priceB)}, diff=${priceDiff}%`
        if (profit.gte(0)) {
            log +=  `\n                                   - arb opportunity: borrow=${tokenBorrowInfo.format(amountBorrow, true)}, profit=${tokenBorrowInfo.format(profit, true)}`
        }
        console.log(log)
    } else {
        console.log(`${timeTag} #${blockNumber} [${tokenAInfo.symbol}/${tokenBInfo.symbol}]`)
        console.log(`- ${dex0.name}=${tokenAInfo.format(price0.priceB)}, ${dex1.name}=${tokenAInfo.format(price1.priceB)}, diff=${priceDiff}%`)
        console.log(`- Reserves: ${dex0.name}=[${tokenAInfo.format(reserves0[0])}, ${tokenBInfo.format(reserves0[1])}], ${dex1.name}=[${tokenAInfo.format(reserves1[0])}, ${tokenBInfo.format(reserves1[1])}]`)
        console.log(`                                   borrow=${tokenBorrowInfo.format(amountBorrow, true)}, profit=${tokenBorrowInfo.format(profit, true)}`)
    }
}

module.exports = {
    getAmountIn,
    getAmountOut,
    createTrade,
    flashswapProfit,
    logBlock
}