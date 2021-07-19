import { BalancerPair, Pair, UniswapPair } from "../pair"
import { Route } from "../route"
import { Trade } from "../trade"


export function logTrade(block: number, route: Route, trade: Trade) {
    const date = new Date()
    const timeTag = `${date.toLocaleTimeString('en-US', { hour12: false })}:${date.getMilliseconds()}`

    const tokenBorrow = trade.firstToken ? route.token0 : route.token1

    console.log(`${timeTag} #${block} ${route.name()}: borrow=${tokenBorrow.format(trade.amountBorrow, true)}, profit=${tokenBorrow.format(trade.profit, true)}`)
}

export function logPair(pair: Pair, block: number | undefined = undefined, prefix: string = '') {
    var s = ''

    if (!pair.hasValue()) {
        s = 'no value'
    } else if (pair instanceof UniswapPair) {
        s = `balance0 = ${pair.token0.format(pair.balance0!, true)}, balance1 = ${pair.token1.format(pair.balance1!, true)}`
    } else if (pair instanceof BalancerPair) {
        s = `balance0 = ${pair.token0.format(pair.balance0!, true)}, balance1 = ${pair.token1.format(pair.balance1!, true)}`
    }
    const b = block ? `#${block} ` : ''
    console.log(`${prefix}${b}[${pair.dex.name} ${pair.token0.symbol}/${pair.token1.symbol}] ${s} | ${pair.token0.symbol} = ${pair.token1.format(pair.price0()!, true)}, ${pair.token1.symbol} = ${pair.token0.format(pair.price1()!, true)}`)
}