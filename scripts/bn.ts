import { BigNumber as BN } from 'bignumber.js'
import { BigNumber } from 'ethers'
BN.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: 1,
    DECIMAL_PLACES: 18,
})

function toBN(x: BigNumber): BN {
    return new BN(x.toString())
}

function fromBN(x: BN): BigNumber {
    return BigNumber.from(x.toString())
}

export { BN, toBN, fromBN }