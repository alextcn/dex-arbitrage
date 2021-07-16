export interface Uniswap {
    name: string
    protocol: 'UniswapV2'
    factory: string
    router: string
}

export interface Balancer {
    name: string
    protocol: 'BalancerV2'
    vault: string
}

export type DEX = Uniswap | Balancer