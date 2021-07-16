
import { ethers } from "hardhat"
import { Contract } from "ethers"
import * as abi from "../../abi/balancer"
import cfg from '../../config.json'

// TODO: make singleton vault


const poolsIdByTokens = new Map<string, string>()
poolsIdByTokens.set(key(cfg.DAI, cfg.WETH), '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a') // 60WETH-40DAI


export function getPoolId(token0: string, token1: string): string | undefined {
    return poolsIdByTokens.get(key(token0, token1))
}

export async function getPoolContract(poolId: string): Promise<Contract> {
    const vault = await ethers.getContractAt(abi.vault, cfg.balancer.vault)
    const [poolAddress] = await vault.getPool(poolId)
    return ethers.getContractAt(abi.pool, poolAddress)
}


function key(token0: string, token1: string): string {
    return token0.toLowerCase() < token1.toLowerCase()
        ? token0 + token1
        : token1 + token0
}