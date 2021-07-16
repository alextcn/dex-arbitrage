import { Balancer, DEX, Uniswap } from "./dex"


interface Route {
    // TODO: 
}

// TODO: pass pair of tokens
export async function buildRoute(dex0: DEX, dex1: DEX): Promise<Route> {
    if (dex0.protocol === 'BalancerV2') throw 'Routes from BalancerV2 no supported'
    return dex1.protocol === 'UniswapV2' ? buildRouteUniToUni(dex0, dex1) : buildRouteUniToBal(dex0, dex1)
}

async function buildRouteUniToUni(uniswap0: Uniswap, uniswap1: Uniswap): Promise<Route> {
    // TODO: implement
    return {}
}

async function buildRouteUniToBal(uniswap: Uniswap, balancer: Balancer): Promise<Route> {
    // TODO: implement
    return {}
}