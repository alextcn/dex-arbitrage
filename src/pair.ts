import { BigNumber } from "ethers"
import { BN } from "./utils/bn"


interface Pair {
    // TODO: 
}

// TODO: single type?

export type UniswapPair = {
    balance0: BigNumber
    balance1: BigNumber
    // make sure balances converted to 18 decimals
}

export type BalancerPool = {
    balance0: BN
    balance1: BN
    weight0: BN
    weight1: BN
    fee: BN
}