const { BigNumber } = require("ethers")
const { flashswapProfit, getAmountIn, createTrade } = require("./trade-utils")
const { reservesToPrice, tokenInfo, getPairContract, diffPercent } = require("./uni-utils")
const { runScript } = require("./utils")


async function main() {
    const tokenInfoA = {"address":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","name":"USD Coin","symbol":"USDC","decimals":6}
    const tokenInfoB = {"address":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2","name":"Wrapped Ether","symbol":"WETH","decimals":18}

    const reserves0 = [BigNumber.from('166527132537660').div(1), BigNumber.from('71672677442879327142582').div(1)]
    const reserves1 = [BigNumber.from('163927132537661').div(5), BigNumber.from('72672677442879327142581').div(5)]
    console.log('----- reserves -----')
    printReserves(reserves0, tokenInfoA, tokenInfoB)
    printReserves(reserves1, tokenInfoA, tokenInfoB)
    
    // print price diff
    printPriceDiff(reserves0, reserves1, tokenInfoA, tokenInfoB)

    // compute trade size
    console.log('----- trade -----')
    const trade = createTrade(reserves0, reserves1)
    printTrade(reserves0, reserves1, trade, tokenInfoA, tokenInfoB)

    // make a trade
    console.log('----- flashswap -----')
    const [xreserves0, xreserves1] = flashswap(reserves0, reserves1, trade.amountBorrowA, trade.amountBorrowB)

    // print reserves and price diff after trade
    printReserves(xreserves0, tokenInfoA, tokenInfoB)
    printReserves(xreserves1, tokenInfoA, tokenInfoB)
    printPriceDiff(xreserves0, xreserves1, tokenInfoA, tokenInfoB)

    printPriceImpact(reserves0, reserves1, xreserves0, xreserves1, tokenInfoA, tokenInfoB)
}


function flashswap(_reserves0, _reserves1, amountBorrowA, amountBorrowB) {
    const reserves0 = [_reserves0[0], _reserves0[1]]
    const reserves1 = [_reserves1[0], _reserves1[1]]

    if (amountBorrowA) {
        const amountRequiredB = getAmountIn(amountBorrowA, reserves0[1], reserves0[0])
        const bestSwapAmountIn = getAmountIn(amountRequiredB, reserves1[0], reserves1[1])

        reserves0[0] = reserves0[0].sub(amountBorrowA)
        reserves0[1] = reserves0[1].add(amountRequiredB)
        reserves1[0] = reserves1[0].add(bestSwapAmountIn)
        reserves1[1] = reserves1[1].sub(amountRequiredB)
    } else {
        const amountRequiredA = getAmountIn(amountBorrowB, reserves0[0], reserves0[1])
        const bestSwapAmountIn = getAmountIn(amountRequiredA, reserves1[1], reserves1[0])

        reserves0[0] = reserves0[0].add(amountRequiredA)
        reserves0[1] = reserves0[1].sub(amountBorrowB)
        reserves1[0] = reserves1[0].sub(amountRequiredA)
        reserves1[1] = reserves1[1].add(bestSwapAmountIn)
    }
    return [reserves0, reserves1]
}


function divPercent(value1, value2, decimals) {
    const d = BigNumber.from('10').pow(18)

    const diff = d.mul(value1).div(value2).div(BigNumber.from('10').pow(18 - decimals))
    return ethers.utils.formatUnits(diff, decimals - 2)
}

function printReserves(reserves, tokenInfoA, tokenInfoB) {
    const price = reservesToPrice(reserves[0], reserves[1], tokenInfoA.decimals, tokenInfoB.decimals)
    console.log(`${ethers.utils.formatUnits(price.priceB, tokenInfoA.decimals)} ${tokenInfoA.symbol}   [${ethers.utils.formatUnits(reserves[0], tokenInfoA.decimals)} ${tokenInfoA.symbol}, ${ethers.utils.formatUnits(reserves[1], tokenInfoB.decimals)} ${tokenInfoB.symbol}]`)
}

function printPriceDiff(reserves0, reserves1, tokenInfoA, tokenInfoB) {
    const price0 = reservesToPrice(reserves0[0], reserves0[1], tokenInfoA.decimals, tokenInfoB.decimals)
    const price1 = reservesToPrice(reserves1[0], reserves1[1], tokenInfoA.decimals, tokenInfoB.decimals)
    const priceDiff = diffPercent(price0.priceB, price1.priceB, 4)

    const kDiff = diffPercent(reserves0[0].mul(reserves0[1]), reserves1[0].mul(reserves1[1]), 5)
    console.log(`price_diff = ${priceDiff}%, k_diff = ${kDiff}%`)
}

function printTrade(reserves0, reserves1, trade, tokenInfoA, tokenInfoB) {
    const profit = flashswapProfit(reserves0, reserves1, trade.amountBorrowA, trade.amountBorrowB)
    if (trade.amountBorrowA) {
        const profitP = divPercent(profit, trade.amountBorrowA, 5)
        console.log(`order_size = ${ethers.utils.formatUnits(trade.amountBorrowA, tokenInfoA.decimals)} ${tokenInfoA.symbol}, profit = ${ethers.utils.formatUnits(profit, tokenInfoA.decimals)} ${tokenInfoA.symbol} (${profitP}%)`)
    } else {
        const profitP = divPercent(profit, trade.amountBorrowB, 5)
        console.log(`order_size = ${ethers.utils.formatUnits(trade.amountBorrowB, tokenInfoB.decimals)} ${tokenInfoB.symbol}, profit = ${ethers.utils.formatUnits(profit, tokenInfoB.decimals)} ${tokenInfoB.symbol} (${profitP}%)`)
    }

    if (trade.amountBorrowA) {
        const d0 = divPercent(trade.amountBorrowA, reserves0[0], 5)
        const d1 = divPercent(trade.amountBorrowA, reserves1[0], 5)
        console.log(`order_share = [${d0}%, ${d1}%]`)
    } else {
        const d0 = divPercent(trade.amountBorrowB, reserves0[1], 5)
        const d1 = divPercent(trade.amountBorrowB, reserves1[1], 5)
        console.log(`order_share = [${d0}%, ${d1}%]`)
    }
}

function printPriceImpact(reserves0, reserves1, xreserves0, xreserves1, tokenInfoA, tokenInfoB) {
    const price0 = reservesToPrice(reserves0[0], reserves0[1], tokenInfoA.decimals, tokenInfoB.decimals)
    const price0x = reservesToPrice(xreserves0[0], xreserves0[1], tokenInfoA.decimals, tokenInfoB.decimals)
    const pi0 = diffPercent(price0x.priceB, price0.priceB, 4)
    
    const price1 = reservesToPrice(reserves1[0], reserves1[1], tokenInfoA.decimals, tokenInfoB.decimals)
    const price1x = reservesToPrice(xreserves1[0], xreserves1[1], tokenInfoA.decimals, tokenInfoB.decimals)
    const pi1 = diffPercent(price1x.priceB, price1.priceB, 4)

    console.log(`price_impact = [${pi0}%, ${pi1}%]`)
}


runScript(main)