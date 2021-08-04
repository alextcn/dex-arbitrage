export interface UniswapV2 {
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

export interface UniswapV3 {
    name: string
    protocol: 'UniswapV3'
    factory: string
    fee: number
}

export type DEX = UniswapV2 | Balancer | UniswapV3