import { BigNumber, Contract } from "ethers"
import { ethers } from "hardhat"
import { BalancerPoolContract, BalancerVaultContract, UniswapPairContract } from "./contracts"
import { Balancer, DEX, Uniswap } from "./dex"
import { Token } from "./token"
import { getPoolId } from "./utils/balancer"
import * as abi from "../abi/balancer"


export abstract class Pair {
    readonly id: string
    readonly dex: DEX
    readonly token0: Token
    readonly token1: Token
    readonly contract: Contract
    lastChangeBlock: number

    abstract hasValue: () => boolean

    constructor(dex: DEX, token0: Token, token1: Token, contract: Contract) {
        this.id = Pair.id(dex.name, token0.address, token1.address)
        this.dex = dex
        this.token0 = token0
        this.token1 = token1
        this.contract = contract
        this.lastChangeBlock = 0
    }

    static id: (dexName: string, token0: string, token1: string) => string 
        = (d, t0, t1) => '_id_' + d + t0 + t1
}


export class UniswapPair extends Pair {
    contract: UniswapPairContract
    balance0: BigNumber | undefined
    balance1: BigNumber | undefined
    
    constructor(dex: Uniswap, token0: Token, token1: Token, contract: UniswapPairContract) {
        super(dex, token0, token1, contract)

        this.contract = contract
    }

    hasValue = () => !this.balance0 && !this.balance1

    updateReserves(balance0: BigNumber, balance1: BigNumber, block: number): void {
        this.balance0 = balance0
        this.balance1 = balance1
        this.lastChangeBlock = block
    }
}

export class BalancerPair extends Pair {
    contract: BalancerPoolContract
    poolId: string
    weight0: BigNumber
    weight1: BigNumber
    fee: BigNumber
    balance0: BigNumber | undefined
    balance1: BigNumber | undefined
    
    constructor(dex: Balancer, token0: Token, token1: Token, poolId: string, weight0: BigNumber, weight1: BigNumber, fee: BigNumber, contract: BalancerPoolContract) {
        super(dex, token0, token1, contract)
        
        this.contract = contract
        this.poolId = poolId
        this.weight0 = weight0
        this.weight1 = weight1
        this.fee = fee
    }

    hasValue = () => !this.balance0 && !this.balance1
    
    updateReserves(balance0: BigNumber, balance1: BigNumber, block: number): void {
        this.balance0 = balance0
        this.balance1 = balance1
        this.lastChangeBlock = block
    }
}


export class PairFactory {
    _vault: BalancerVaultContract

    constructor(vault: BalancerVaultContract) {
        this._vault = vault
    }

    async makePair(dex: DEX, token0: Token, token1: Token): Promise<Pair | undefined> {
        return dex.protocol === 'UniswapV2'
            ? this.makeUniswapPair(dex, token0, token1)
            : this.makeBalancerPool(dex, token0, token1)
    }

    // TODO: support no pair
    async makeUniswapPair(dex: Uniswap, token0: Token, token1: Token): Promise<UniswapPair | undefined> {
        // TODO: cache factory
        var f = await ethers.getContractAt('@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory', dex.factory)
        var pairAddress = await f.getPair(token0.address, token1.address)
        if (pairAddress === '0x0000000000000000000000000000000000000000') return
        
        const c = await ethers.getContractAt('@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair', pairAddress) as UniswapPairContract
        return new UniswapPair(dex, token0, token1, c)
    }

    // TODO: support no pool
    async makeBalancerPool(dex: Balancer, token0: Token, token1: Token): Promise<BalancerPair | undefined> {
        const poolId = getPoolId(token0.address, token1.address)
        if (!poolId) return

        const [poolAddress] = await this._vault.getPool(poolId)
        if (poolAddress === '0x0000000000000000000000000000000000000000') return
        
        const pool = await ethers.getContractAt(abi.pool, poolAddress) as BalancerPoolContract
        const [weight0, weight1] = await pool.getNormalizedWeights()
        const fee = await pool.getSwapFeePercentage()
        
        return new BalancerPair(dex, token0, token1, poolId, weight0, weight1, fee, pool)
    }
    
}