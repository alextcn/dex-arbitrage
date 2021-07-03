
function timeTag() {
    const date = new Date()
    return `${date.toLocaleTimeString('en-US', { hour12: false })}:${date.getMilliseconds()}`
}

function logBlock(blockNumber, uniPrice, sushiPrice, priceDiff) {
    console.log(`
${timeTag()} #${blockNumber} [WETH/DAI]
- uni=${uniPrice.priceBFormatted}, sushi=${sushiPrice.priceBFormatted}, diff=${priceDiff}%
- uni reserves=(${ethers.utils.formatUnits(uniPrice.reserveA, 18)}, ${ethers.utils.formatUnits(uniPrice.reserveB)})
- sushi_reserves=(${ethers.utils.formatUnits(sushiPrice.reserveA)}, ${ethers.utils.formatUnits(sushiPrice.reserveB)})`)
}

module.exports = {
    timeTag,
    logBlock
}