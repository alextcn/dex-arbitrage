import { Token } from "@uniswap/sdk"
import { Balancer, DEX, Uniswap } from "./dex"
import { BalancerPool, pairHasValue, UniswapPair } from "./pair"


export interface UniToUniRoute {
    token0: Token
    token1: Token
    pairFrom: UniswapPair
    pairTo: UniswapPair
}

export interface UniToBalRoute {
    token0: Token
    token1: Token
    pairFrom: UniswapPair
    poolTo: BalancerPool
}

export type Route = UniToUniRoute | UniToBalRoute

// TODO: pass pair of tokens
export async function buildRoute(dexFrom: DEX, dexTo: DEX, token0: Token, token1: Token): Promise<Route> {
    if (dexFrom.protocol === 'BalancerV2') throw 'Routes from BalancerV2 no supported'
    return dexTo.protocol === 'UniswapV2' 
        ? buildRouteUniToUni(dexFrom, dexTo, token0, token1) 
        : buildRouteUniToBal(dexFrom, dexTo, token0, token1)
}

async function buildRouteUniToUni(uniFrom: Uniswap, uniTo: Uniswap, token0: Token, token1: Token): Promise<UniToUniRoute> {
    // TODO: implement
    return {}
}

async function buildRouteUniToBal(uniFrom: Uniswap, balancerTo: Balancer, token0: Token, token1: Token): Promise<UniToBalRoute> {
    // TODO: implement
    return {}
}