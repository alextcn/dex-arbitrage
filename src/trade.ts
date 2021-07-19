import { BigNumber } from "ethers"
import { addDecimals, BN, fromBN, subDecimals, toBN } from "./utils/bn"
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
    if (pairUni.token0.address != pairBal.token0.address ||
        pairUni.token1.address != pairBal.token1.address) throw 'Pairs have different tokens'
    
    // bmath assumes all values has 18 decimals
    const d0 = 18 - pairUni.token0.decimals
    const d1 = 18 - pairUni.token1.decimals
    const uniBalance0 = d0 > 0 ? addDecimals(pairUni.balance0!, d0) : pairUni.balance0!
    const uniBalance1 = d1 > 0 ? addDecimals(pairUni.balance1!, d1) : pairUni.balance1!
    const balBalance0 = d0 > 0 ? addDecimals(pairBal.balance0!, d0) : pairBal.balance0!
    const balBalance1 = d1 > 0 ? addDecimals(pairBal.balance1!, d1) : pairBal.balance1!
    const borrow = addDecimals(amountBorrow, isFirstToken ? d0 : d1)
    
    if (isFirstToken) {
        const amountToReturn = getAmountInUni(borrow, uniBalance1, uniBalance0)
        const amountToSwap = bmath.calcInGivenOut(toBN(balBalance0), toBN(pairBal.weight0), toBN(balBalance1), toBN(pairBal.weight1), toBN(amountToReturn), toBN(pairBal.fee)) 
        const profit = borrow.sub(fromBN(amountToSwap))
        return subDecimals(profit, isFirstToken ? d0 : d1)
    } else {
        const amountToReturn = getAmountInUni(borrow, uniBalance0, uniBalance1)
        const amountToSwap = bmath.calcInGivenOut(toBN(balBalance1), toBN(pairBal.weight1), toBN(balBalance0), toBN(pairBal.weight0), toBN(amountToReturn), toBN(pairBal.fee)) 
        const profit = borrow.sub(fromBN(amountToSwap))
        return subDecimals(profit, isFirstToken ? d0 : d1)
    }
}

// Returns maximum potential profit of flashswap: borrowing amountBorrow tokens on DEX0,
// swapping it on another tokens on DEX1 to return debt, and leaving rest of borrowed tokens as a profit.
// Actual profit could be different due to frontrunning.
export function flashswapProfitUniToUni(pair0: UniswapPair, pair1: UniswapPair, amountBorrow: BigNumber, isFirstToken: boolean): BigNumber {
    if (!pair0.hasValue() || !pair1.hasValue()) throw 'Pairs must have balances'
    if (pair0.token0.address != pair1.token0.address ||
        pair0.token1.address != pair1.token1.address) throw 'Pairs have different tokens'

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

    const d = BigNumber.from('10').pow(18)

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