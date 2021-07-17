import { BigNumber } from "ethers"
import { BN, fromBN, toBN } from "./utils/bn"
import { bmath } from "@balancer-labs/sor"
import { BalancerPair, UniswapPair } from "./pair"

export interface Trade {
    amountBorrow: BigNumber
    firstToken: boolean
    profit: BigNumber
}


// TODO: add decimals up to 18 for toBN
// Returns profit of flashswap between Uniswap and Balancer.
export function flashswapProfitUniToBalancer(pairUni: UniswapPair, pairBal: BalancerPair, amountBorrow: BigNumber, isFirstToken: boolean): BigNumber {
    if (!pairUni.hasValue() || !pairBal.hasValue()) throw 'Pairs must have balances'

    if (isFirstToken) {
        const amountToReturn = getAmountInUni(amountBorrow, pairUni.balance1!, pairUni.balance0!)
        const amountToSwap = bmath.calcInGivenOut(toBN(pairBal.balance0!), toBN(pairBal.weight0), toBN(pairBal.balance1!), toBN(pairBal.weight1), toBN(amountToReturn), toBN(pairBal.fee)) 
        return amountBorrow.sub(fromBN(amountToSwap))
    } else {
        const amountToReturn = getAmountInUni(amountBorrow, pairUni.balance0!, pairUni.balance1!)
        // TODO: toBN with decimals!
        const amountToSwap = bmath.calcInGivenOut(toBN(pairBal.balance1!), toBN(pairBal.weight1), toBN(pairBal.balance0!), toBN(pairBal.weight0), toBN(amountToReturn), toBN(pairBal.fee)) 
        return amountBorrow.sub(fromBN(amountToSwap))
    }
}

// Returns maximum potential profit of flashswap: borrowing amountBorrow tokens on DEX0,
// swapping it on another tokens on DEX1 to return debt, and leaving rest of borrowed tokens as a profit.
// Actual profit could be different due to frontrunning.
export function flashswapProfitUniToUni(pair0: UniswapPair, pair1: UniswapPair, amountBorrow: BigNumber, isFirstToken: boolean): BigNumber {
    if (!pair0.hasValue() || !pair1.hasValue()) throw 'Pairs must have balances'

    if (isFirstToken) {
        const amountRequiredB = getAmountInUni(amountBorrow, pair0.balance1!, pair0.balance0!)
        const minSwapAmountIn = getAmountInUni(amountRequiredB, pair1.balance0!, pair1.balance1!)
        return amountBorrow.sub(minSwapAmountIn)
    } else {
        const amountRequiredA = getAmountInUni(amountBorrow, pair0.balance0!, pair0.balance1!)
        const minSwapAmountIn = getAmountInUni(amountRequiredA, pair1.balance1!, pair1.balance0!)
        return amountBorrow.sub(minSwapAmountIn)
    }
}

// Calculates amount of tokens to borrow.
// Returns amount of token B if Uniswap price of token B is larger,
// otherwise amount of token A. Trade size is half of required amount to 
// move less liquid market to more luquid market.
// 
// trade_size(PI%) ~= (pool_size * PI%) / 2
export function tradeSizeUniToUni(pair0: UniswapPair, pair1: UniswapPair) {
    if (!pair0.hasValue() || !pair1.hasValue()) throw 'Pairs must have balances'

    const precision = 18
    const d = BigNumber.from('10').pow(precision)

    // price0/price1
    const priceDiff = d.mul(pair0.balance0!).mul(pair1.balance1!).div(pair0.balance1!).div(pair1.balance0!).sub(d)

    var amountBorrowA
    var amountBorrowB
    
    // calc based on half of price impact of less liquid market
    if (pair0.balance0!.mul(pair0.balance1!).lt(pair1.balance0!.mul(pair1.balance1!))) {
        amountBorrowA = priceDiff.gte(0) ? pair0.balance0!.mul(priceDiff).div(2).div(d).div(2) : undefined
        amountBorrowB = priceDiff.gte(0) ? undefined : pair0.balance1!.mul(-1).mul(priceDiff).div(2).div(d).div(2)
    } else {
        amountBorrowA = priceDiff.gte(0) ? pair1.balance0!.mul(priceDiff).div(2).div(d).div(2) : undefined
        amountBorrowB = priceDiff.gte(0) ? undefined : pair1.balance1!.mul(-1).mul(priceDiff).div(2).div(d).div(2)
    }
    
    // check max borrow reserves
    if (amountBorrowA && amountBorrowA.gte(pair0.balance0!)) {
        amountBorrowA = pair0.balance0
    }
    if (amountBorrowB && amountBorrowB.gte(pair0.balance1!)) {
        amountBorrowB = pair0.balance1
    }

    return {
        amountBorrow: amountBorrowA ? amountBorrowA : amountBorrowB!,
        firstToken: !!amountBorrowA
    }
}

export function tradeSizeUniToBalancer(pairUni: UniswapPair, pairBal: BalancerPair) {
    // TODO: implement
    return {
        amountBorrow: BigNumber.from(0),
        firstToken: Boolean(true)
    }
}

// Returns a required input amount of the other asset, 
// given an output amount of an asset and pair reserves.
export function getAmountInUni(amountOut: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber): BigNumber {
    const numerator = reserveIn.mul(amountOut).mul(1000)
    const denominator = reserveOut.sub(amountOut).mul(997)
    return numerator.div(denominator).add(1)
}

// Returns the maximum output amount of the other asset, 
// given an input amount of an asset and pair reserves.
export function getAmountOutUni(amountIn: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber): BigNumber {
    const amountInWithFee = amountIn.mul(997)
    const numerator = amountInWithFee.mul(reserveOut)
    const denominator = reserveIn.mul(1000).add(amountInWithFee)
    return numerator.div(denominator)
}