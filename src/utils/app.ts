import { Route } from "../route"
import { Trade } from "../trade"


export function logTrade(block: number, route: Route, trade: Trade) {
    const date = new Date()
    const timeTag = `${date.toLocaleTimeString('en-US', { hour12: false })}:${date.getMilliseconds()}`

    const tokenBorrow = trade.firstToken ? route.token0 : route.token1

    console.log(`${timeTag} #${block} ${route.name()}: borrow=${tokenBorrow.format(trade.amountBorrow, true)}, profit=${tokenBorrow.format(trade.profit, true)}`)
}