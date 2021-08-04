import { runScript } from "../src/utils/utils";
import cfg from '../config.json'
import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import { Pool, Tick, TickListDataProvider, FeeAmount, NoTickDataProvider, nearestUsableTick } from "@uniswap/v3-sdk/";
import poolData from '../pool-data.json';
import { ethers } from "hardhat";
import { BigNumber } from "ethers";


const tickMapper : (o: any) => Tick = (o: any) => {
    return new Tick({
        index: parseInt(o.tickIdx),
        liquidityGross: o.liquidityGross,
        liquidityNet: o.liquidityNet
    })
}

const WETH = new Token(1, cfg.WETH, 18, 'WETH', 'Wrapper Ethereum')
const USDC = new Token(1, cfg.USDC, 6, 'USDC', 'USD Coin')

const AMOUNT_BORROW_WETH = 1e18

const SQRT_RATIO_X96 = '1589913809030176299627366023627231' // taken from etherscan
const LIQUIDITY = poolData.liquidity;
const TICK_CURRENT = parseInt(poolData.tick)
const TICKS = new TickListDataProvider(
    poolData.ticks.map(tickMapper),
    60
)


async function main() {    
    // fetch and parse ticks
    // encodeSqrtRatioX96(2e18, 1000e6)

    // access contract
    // const contract = await ethers.getContractAt(
    //     '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol:IUniswapV3Pool', 
    //     '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8'
    // )
    // const tick = nearestUsableTick(TICK_CURRENT, 60)
    // console.log(`current tick = ${TICK_CURRENT}, nearest usable tick = ${tick}`)
    // const t = await contract.ticks(tick)
    // console.log(t)


    const pool: Pool = new Pool(
        WETH, USDC, FeeAmount.MEDIUM, 
        SQRT_RATIO_X96, // sqrtRatioX96 - The sqrt of the current ratio of amounts of token1 to token0
        LIQUIDITY, // liquidity - The current value of in range liquidity
        TICK_CURRENT, // tickCurrent - The current tick of the pool
        TICKS // ticks - The current state of the pool ticks or a data provider that can return tick data
    )
    // console.log(pool)

    const amount = CurrencyAmount.fromRawAmount(WETH, AMOUNT_BORROW_WETH)
    const [requiredAmount, _newPool] = await pool.getInputAmount(amount)

    console.log(requiredAmount.toExact())
    console.log(requiredAmount.decimalScale.toString())

}


runScript(main)