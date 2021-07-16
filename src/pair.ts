import { Token } from "@uniswap/sdk"
import { BigNumber } from "ethers"
import { Balancer, Uniswap } from "./dex"
import { BN } from "./utils/bn"


// make sure balances converted to 18 decimals
export interface UniswapPair {
    dex: Uniswap
    token0: Token
    token1: Token
    balance0: BigNumber | undefined
    balance1: BigNumber | undefined
}

export interface BalancerPool {
    dex: Balancer
    token0: string
    token1: string
    balance0: BN | undefined
    balance1: BN | undefined
    weight0: BN | undefined
    weight1: BN | undefined
    fee: BN | undefined
}

export type Pair = UniswapPair | BalancerPool


export function pairHasValue(pair: Pair): boolean {
    return isUniswapPair(pair)
        ? !pair.balance0 && !pair.balance1
        : !pair.balance0 && !pair.balance1 && !pair.weight0 && !pair.weight1
}


function isUniswapPair(pair: Pair): pair is UniswapPair {
    return (pair.dex as Uniswap) !== undefined
}