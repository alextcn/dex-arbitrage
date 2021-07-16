
const { diffPercent, reservesToPrice } = require("./uni")

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
    logBlock
}