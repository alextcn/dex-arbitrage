
import { ethers } from "hardhat"
import { runScript } from "./utils"
import cfg from '../config.json'
import { BigNumber } from "ethers"
import { bmath } from "@balancer-labs/sor"
import { BigNumber as BN } from "./bignumber"

const valutAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
const poolID = '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a' // 60WETH-40DAI


runScript(async function () {
    const vaultAbi = [
        'function getPool(bytes32 poolId) external view returns (address, uint8)',
        'function getPoolTokens(bytes32 poolId) external view returns (address[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock)'
    ]
    const vault = await ethers.getContractAt(vaultAbi, valutAddress)

    const [poolAddress] = await vault.getPool(poolID)
    console.log(`vault.getPool: poolAddress = ${poolAddress}`)

    const result = await vault.getPoolTokens(poolID)
    const [dai, weth] = result[0] as string[]
    const [daiBalance, wethBalance] = result[1] as BigNumber[]
    console.log(`vault.getPoolTokens: tokens = [${dai}, ${weth}], balances = [${ethers.utils.formatUnits(daiBalance, 18)}, ${ethers.utils.formatUnits(wethBalance, 18)}]`)

    const poolAbi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function getNormalizedWeights() external view returns (uint256[] memory)",
        "function getSwapFeePercentage() external view returns (uint256)"
    ]
    const pool = await ethers.getContractAt(poolAbi, poolAddress)

    const poolName = await pool.name()
    const [daiWeight, wethWeight] = (await pool.getNormalizedWeights()) as BigNumber[] // 18 decimals: [0.6, 0.4]
    const swapFee = (await pool.getSwapFeePercentage()) as BigNumber
    console.log(`pool: name = ${poolName}, swapFee = ${ethers.utils.formatUnits(swapFee, 18)}, weights = [${ethers.utils.formatUnits(daiWeight, 16)}%, ${ethers.utils.formatUnits(wethWeight, 16)}%]`)

    // 1 WETH = (DAI/40)/(WETH/60)
    const precision = 18
    const wethPrice = BigNumber.from(10).pow(precision).mul(daiBalance).div(daiWeight).div(wethBalance.div(wethWeight))
    const daiPrice = BigNumber.from(10).pow(precision).mul(wethBalance).div(wethWeight).div(daiBalance.div(daiWeight))
    console.log(`1 WETH = ${ethers.utils.formatUnits(wethPrice, precision)} DAI`)
    console.log(`1 DAI  = ${ethers.utils.formatUnits(daiPrice, precision)} WETH`)

    // calculate price after selling/buing 10 WETH
    const amountIn = ethers.utils.parseUnits('10', 18)    
    const amountOutBN = bmath.calcOutGivenIn(toBN(wethBalance), toBN(wethWeight), toBN(daiBalance), toBN(daiWeight), toBN(amountIn), toBN(swapFee))
    const amountOut = fromBN(amountOutBN)
    console.log(`swap ${ethers.utils.formatUnits(amountIn, 18)} WETH for ${ethers.utils.formatUnits(amountOut, 18)} DAI`)
})


function toBN(x: BigNumber): BN {
    return new BN(x.toString())
}

function fromBN(x: BN): BigNumber {
    return BigNumber.from(x.toString())
}