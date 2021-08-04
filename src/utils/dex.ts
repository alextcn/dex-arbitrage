import { BigNumber } from "ethers";
import { UniswapV2Pool } from "../pool";

export function uniPrice(pair: UniswapV2Pool, price0: boolean): BigNumber {
    return price0
        ? pair.balance1.mul(BigNumber.from(10).pow(18)).div(pair.balance0)
        : pair.balance0.mul(BigNumber.from(10).pow(18)).div(pair.balance1)
}