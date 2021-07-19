
import { ethers } from "hardhat"
import { Contract } from "ethers"
import * as abi from "../../abi/balancer"
import cfg from '../../config.json'

// TODO: make singleton vault

const poolIDs = new Map<string, string>()
poolIDs.set(key(cfg.WBTC, cfg.WETH), '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e') // 50WBTC-50WETH
poolIDs.set(key(cfg.BAL, cfg.WETH), '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014') // 80BAL-20WETH
poolIDs.set(key(cfg.WETH, cfg.DAI), '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a') // 60WETH-40DAI
poolIDs.set(key(cfg.USDC, cfg.WETH), '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019') // 50USDC-50WETH
poolIDs.set(key(cfg.WETH, cfg.USDT), '0x3e5fa9518ea95c3e533eb377c001702a9aacaa32000200000000000000000052') // 50WETH-50USDT
poolIDs.set(key(cfg.SNX, cfg.WETH), '0x072f14b85add63488ddad88f855fda4a99d6ac9b000200000000000000000027') // 50SNX-50WETH
poolIDs.set(key(cfg.PAR, cfg.USDC), '0x5d6e3d7632d6719e04ca162be652164bec1eaa6b000200000000000000000048') // 50PAR-50USDC
poolIDs.set(key(cfg.YFI, cfg.WETH), '0x186084ff790c65088ba694df11758fae4943ee9e000200000000000000000013') // 50YFI-50WETH
poolIDs.set(key(cfg.LINK, cfg.WETH), '0xe99481dc77691d8e2456e5f3f61c1810adfc1503000200000000000000000018') // 50LINK-50WETH
poolIDs.set(key(cfg.COMP, cfg.WETH), '0xefaa1604e82e1b3af8430b90192c1b9e8197e377000200000000000000000021') // 50COMP-50WETH
poolIDs.set(key(cfg.PAR, cfg.WETH), '0x29d7a7e0d781c957696697b94d4bc18c651e358e000200000000000000000049') // 50PAR-50WETH
poolIDs.set(key(cfg.REN, cfg.WETH), '0xec60a5fef79a92c741cb74fdd6bfc340c0279b01000200000000000000000015') // 50REN-50WETH
poolIDs.set(key(cfg.UNI, cfg.WETH), '0x5aa90c7362ea46b3cbfbd7f01ea5ca69c98fef1c000200000000000000000020') // 50UNI-50WETH
poolIDs.set(key(cfg.MATIC, cfg.WETH), '0xa02e4b3d18d4e6b8d18ac421fbc3dfff8933c40a00020000000000000000004b') // 50MATIC-50WETH
poolIDs.set(key(cfg.GTC, cfg.WETH), '0xff083f57a556bfb3bbe46ea1b4fa154b2b1fbe88000200000000000000000030') // 80GTC-20WETH
poolIDs.set(key(cfg.WETH, cfg.BAT), '0xde148e6cc3f6047eed6e97238d341a2b8589e19e000200000000000000000017') // 60WETH-40BAT


export function getPoolId(token0: string, token1: string): string | undefined {
    return poolIDs.get(key(token0, token1))
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