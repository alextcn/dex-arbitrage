import { BigNumber as BN } from 'bignumber.js'
import { BigNumber } from 'ethers'
BN.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: 1,
    DECIMAL_PLACES: 18,
})

function toBN(x: BigNumber, extraDecimals: number = 0): BN {
    if (extraDecimals == 0) return new BN(x.toString())
    else return new BN(x.mul(BigNumber.from(10).pow(extraDecimals)).toString())
}

function fromBN(x: BN, extraDecimals: number = 0): BigNumber {
    if (extraDecimals == 0) return BigNumber.from(x.toString())
    else return BigNumber.from(x.toString()).div(BigNumber.from(10).pow(extraDecimals))
}

function addDecimals(x: BigNumber, n: number): BigNumber {
    return x.mul(BigNumber.from(10).pow(n))
}

function subDecimals(x: BigNumber, n: number): BigNumber {
    return x.div(BigNumber.from(10).pow(n))
}

export { BN, toBN, fromBN, addDecimals, subDecimals }