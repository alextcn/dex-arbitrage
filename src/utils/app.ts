import { BalancerPool, Pool, UniswapPool } from "../pool"
import { Route } from "../route"
import { Trade } from "../trade"


export function logTrade(block: number, route: Route, trade: Trade) {
    const date = new Date()
    const timeTag = `${date.toLocaleTimeString('en-US', { hour12: false })}:${date.getMilliseconds()}`

    const tokenBorrow = trade.firstToken ? route.token0 : route.token1

    console.log(`${timeTag} #${block} ${route.name()}: borrow=${tokenBorrow.format(trade.amountBorrow, true)}, profit=${tokenBorrow.format(trade.profit, true)}`)
}

export function logPool(pool: Pool, block: number | undefined = undefined, prefix: string = '') {
    var s = ''

    if (!pool.hasValue()) {
        s = 'no value'
    } else if (pool instanceof UniswapPool) {
        s = `balance0 = ${pool.token0.format(pool.balance0!, true)}, balance1 = ${pool.token1.format(pool.balance1!, true)}`
    } else if (pool instanceof BalancerPool) {
        s = `balance0 = ${pool.token0.format(pool.balance0!, true)}, balance1 = ${pool.token1.format(pool.balance1!, true)}`
    }
    const b = block ? `#${block} ` : ''
    console.log(`${prefix}${b}[${pool.dex.name} ${pool.token0.symbol}/${pool.token1.symbol}] ${s} | ${pool.token0.symbol} = ${pool.token1.format(pool.price0()!, true)}, ${pool.token1.symbol} = ${pool.token0.format(pool.price1()!, true)}`)
}