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

export interface UniswapV3 {
    name: string
    protocol: 'UniswapV3'
    factory: string
    fee: 3000 // only scan for 0.3%-fee pools atm
}

export type DEX = Uniswap | Balancer | UniswapV3