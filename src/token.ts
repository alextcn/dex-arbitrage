import { BigNumber, utils } from "ethers"
import { BN, fromBN } from "./utils/bn"

/* Represent ERC20 token. */
export class Token {
    readonly address: string
    readonly name: string
    readonly symbol: string
    readonly decimals: number

    constructor(address: string, name: string, symbol: string, decimals: number) {
        this.address = address
        this.name = name
        this.symbol = symbol
        this.decimals = decimals
    }

    format(amount: BigNumber | BN, withSymbol: boolean = false) {    
        const v = amount instanceof BigNumber ? amount : fromBN(amount)
        const s = utils.formatUnits(v, this.decimals)
        if (withSymbol) return `${s} ${this.symbol}`
        return s
    }
}