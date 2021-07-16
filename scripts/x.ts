import { BigNumber } from "ethers"
import { BN, fromBN, toBN } from "./bn"
import { bmath } from "@balancer-labs/sor"
import { ethers } from "hardhat"


interface Uniswap {
    name: string
    protocol: 'UniswapV2'
    factory: string
    router: string
}

interface Balancer {
    name: string
    protocol: 'BalancerV2'
    vault: string
}

type DEX = Uniswap | Balancer



// TODO: pass pair of tokens
export async function buildRoute(dex0: DEX, dex1: DEX): Promise<void> {
    if (dex0.protocol === 'BalancerV2') throw 'Routes from BalancerV2 no supported'
    return dex1.protocol === 'UniswapV2' ? buildRouteUniToUni(dex0, dex1) : buildRouteUniToBal(dex0, dex1)
}

async function buildRouteUniToUni(uniswap0: Uniswap, uniswap1: Uniswap): Promise<void> {
    // TODO: implement
}

async function buildRouteUniToBal(uniswap: Uniswap, balancer: Balancer): Promise<void> {
    // TODO: implement
}



// ############ 

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

// Returns profit of flashswap between Uniswap and Balancer.
export function flashswapProfitUniToBalancer(pairUni: UniswapPair, poolBal: BalancerPool, amountBorrow: BigNumber, isBorrowFirst: boolean): BigNumber {
    if (isBorrowFirst) {
        const amountToReturn = getAmountInUni(amountBorrow, pairUni.balance1, pairUni.balance0)
        const amountToSwap = bmath.calcInGivenOut(poolBal.balance0, poolBal.weight0, poolBal.balance1, poolBal.weight1, toBN(amountToReturn), poolBal.fee) 
        return amountBorrow.sub(fromBN(amountToSwap))
    } else {
        const amountToReturn = getAmountInUni(amountBorrow, pairUni.balance0, pairUni.balance1)
        const amountToSwap = bmath.calcInGivenOut(poolBal.balance1, poolBal.weight1, poolBal.balance0, poolBal.weight0, toBN(amountToReturn), poolBal.fee) 
        return amountBorrow.sub(fromBN(amountToSwap))
    }
}

// Returns maximum potential profit of flashswap: borrowing amountBorrow tokens on DEX0,
// swapping it on another tokens on DEX1 to return debt, and leaving rest of borrowed tokens as a profit.
// Actual profit could be different due to frontrunning.
export function flashswapProfitUniToUni(pair0: UniswapPair, pair1: UniswapPair, amountBorrow: BigNumber, isBorrowFirst: boolean): BigNumber {
    if (isBorrowFirst) {
        const amountRequiredB = getAmountInUni(amountBorrow, pair0.balance1, pair0.balance0)
        const minSwapAmountIn = getAmountInUni(amountRequiredB, pair1.balance0, pair1.balance1)
        return amountBorrow.sub(minSwapAmountIn)
    } else {
        const amountRequiredA = getAmountInUni(amountBorrow, pair0.balance0, pair0.balance1)
        const minSwapAmountIn = getAmountInUni(amountRequiredA, pair1.balance1, pair1.balance0)
        return amountBorrow.sub(minSwapAmountIn)
    }
}

// Returns a required input amount of the other asset, 
// given an output amount of an asset and pair reserves.
function getAmountInUni(amountOut: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber): BigNumber {
    const numerator = reserveIn.mul(amountOut).mul(1000)
    const denominator = reserveOut.sub(amountOut).mul(997)
    return numerator.div(denominator).add(1)
}

// Returns the maximum output amount of the other asset, 
// given an input amount of an asset and pair reserves.
function getAmountOutUni(amountIn: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber): BigNumber {
    const amountInWithFee = amountIn.mul(997)
    const numerator = amountInWithFee.mul(reserveOut)
    const denominator = reserveIn.mul(1000).add(amountInWithFee)
    return numerator.div(denominator)
}

export function uniPrice(pair: UniswapPair, price0: boolean): BigNumber {
    return price0
        ? pair.balance1.mul(BigNumber.from(10).pow(18)).div(pair.balance0)
        : pair.balance0.mul(BigNumber.from(10).pow(18)).div(pair.balance1)
}