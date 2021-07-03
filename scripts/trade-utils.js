
function timeTag() {
    const date = new Date()
    return `${date.toLocaleTimeString('en-US', { hour12: false })}:${date.getMilliseconds()}`
}

function logBlock(blockNumber, uniPrice, sushiPrice, priceDiff) {
    console.log(`
${timeTag()} #${blockNumber} [WETH/DAI]
- uni=${uniPrice.priceBFormatted}, sushi=${sushiPrice.priceBFormatted}, diff=${priceDiff}%
- uni_reserves=(${ethers.utils.formatUnits(uniPrice.reserveA, 18)}, ${ethers.utils.formatUnits(uniPrice.reserveB)})
- sushi_reserves=(${ethers.utils.formatUnits(sushiPrice.reserveA)}, ${ethers.utils.formatUnits(sushiPrice.reserveB)})`)
}


// given an output amount of an asset and pair reserves, returns a required input amount of the other asset
function getAmountIn(amountOut, reserveIn, reserveOut) {
    const numerator = reserveIn.mul(amountOut).mul(1000)
    const denominator = reserveOut.sub(amountOut).mul(997)
    return numerator.div(denominator).add(1)
}

// Returns maximum potential profit of flashswap: borrowing amountBorrowDAI DAI on Uniswap,
// swapping it on WETH on Sushiswap to return debt, and leaving rest of DAI as a profit.
// Actual profit could be different due to frontrunning.
function maxTradeProfit(uniPrice, sushiPrice, amountBorrowDAI) {
    const amountRequiredWETH = getAmountIn(amountBorrowDAI, uniPrice.reserveB, uniPrice.reserveA)
    const minSwapAmountIn = getAmountIn(amountRequiredWETH, sushiPrice.reserveA, sushiPrice.reserveB)
    return amountBorrowDAI.sub(minSwapAmountIn)
}

module.exports = {
    timeTag,
    logBlock,
    getAmountIn,
    maxTradeProfit
}