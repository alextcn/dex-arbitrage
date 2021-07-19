import { BigNumber } from "ethers"
import { Balancer, DEX, Uniswap } from "./dex"
import { BalancerPair, Pair, UniswapPair } from "./pair"
import { Token } from "./token"
import { flashswapProfitUniToBalancer, flashswapProfitUniToUni, Trade, tradeSizeUniToBalancer, tradeSizeUniToUni } from "./trade"

export abstract class Route {
    readonly token0: Token
    readonly token1: Token
    readonly pairFrom: Pair
    readonly pairTo: Pair

    constructor(pairFrom: Pair, pairTo: Pair) {
        if (pairFrom.token0.address !== pairTo.token0.address || 
            pairFrom.token1.address !== pairTo.token1.address) throw 'Pairs have different tokens'

        this.token0 = pairFrom.token0
        this.token1 = pairFrom.token1
        this.pairFrom = pairFrom
        this.pairTo = pairTo
    }

    abstract calculateTrade(): Trade

    name(): string {
        return `[${this.pairFrom.dex.name}->${this.pairTo.dex.name}] ${this.token0.symbol}/${this.token1.symbol}`
    }
}

export class UniToUniRoute extends Route {
    readonly pairFrom: UniswapPair
    readonly pairTo: UniswapPair

    constructor(pairFrom: UniswapPair, pairTo: UniswapPair) {
        super(pairFrom, pairTo)
        
        this.pairFrom = pairFrom
        this.pairTo = pairTo
    }

    calculateTrade(): Trade {
        return tradeSizeUniToUni(this.pairFrom, this.pairTo)
    }

}

export class UniToBalRoute extends Route {
    readonly pairFrom: UniswapPair
    readonly pairTo: BalancerPair

    constructor(pairFrom: UniswapPair, pairTo: BalancerPair) {
        super(pairFrom, pairTo)

        this.pairFrom = pairFrom
        this.pairTo = pairTo
    }

    calculateTrade() : Trade {
        return  tradeSizeUniToBalancer(this.pairFrom, this.pairTo)
    }
}

export function buildRoute(pairFrom: Pair, pairTo: Pair): Route {
    if (pairFrom instanceof BalancerPair) throw 'Routes from BalancerV2 aren\'t supported'
    
    return pairTo instanceof UniswapPair
        ? new UniToUniRoute(pairFrom as UniswapPair, pairTo)
        : new UniToBalRoute(pairFrom as UniswapPair, pairTo as BalancerPair)
}