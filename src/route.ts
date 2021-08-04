import { BalancerPool, Pool, UniswapV2Pool } from "./pool"
import { Token } from "./token"
import { Trade, tradeSizeUniToBalancer, tradeSizeUniToUni } from "./trade"

export abstract class Route {
    readonly token0: Token
    readonly token1: Token
    readonly poolFrom: Pool
    readonly poolTo: Pool

    constructor(poolFrom: Pool, poolTo: Pool) {
        if (poolFrom.token0.address !== poolTo.token0.address || 
            poolFrom.token1.address !== poolTo.token1.address) throw 'Pools have different tokens'

        this.token0 = poolFrom.token0
        this.token1 = poolFrom.token1
        this.poolFrom = poolFrom
        this.poolTo = poolTo
    }

    abstract calculateTrade(): Trade

    name(): string {
        return `[${this.poolFrom.dex.name}->${this.poolTo.dex.name}] ${this.token0.symbol}/${this.token1.symbol}`
    }
}

export class UniToUniRoute extends Route {
    readonly poolFrom: UniswapV2Pool
    readonly poolTo: UniswapV2Pool

    constructor(poolFrom: UniswapV2Pool, poolTo: UniswapV2Pool) {
        super(poolFrom, poolTo)
        
        this.poolFrom = poolFrom
        this.poolTo = poolTo
    }

    calculateTrade(): Trade {
        return tradeSizeUniToUni(this.poolFrom, this.poolTo)
    }

}

export class UniToBalRoute extends Route {
    readonly poolFrom: UniswapV2Pool
    readonly poolTo: BalancerPool

    constructor(poolFrom: UniswapV2Pool, poolTo: BalancerPool) {
        super(poolFrom, poolTo)

        this.poolFrom = poolFrom
        this.poolTo = poolTo
    }

    calculateTrade() : Trade {
        return  tradeSizeUniToBalancer(this.poolFrom, this.poolTo)
    }
}

export function buildRoute(poolFrom: Pool, poolTo: Pool): Route {
    if (poolFrom instanceof BalancerPool) throw 'Routes from BalancerV2 aren\'t supported'
    
    return poolTo instanceof UniswapV2Pool
        ? new UniToUniRoute(poolFrom as UniswapV2Pool, poolTo)
        : new UniToBalRoute(poolFrom as UniswapV2Pool, poolTo as BalancerPool)
}