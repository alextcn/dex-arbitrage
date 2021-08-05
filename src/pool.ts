import { BigNumber, Contract } from "ethers"
import { ethers } from "hardhat"
import { BalancerPoolContract, BalancerVaultContract, UniswapPairContract, UniV3PoolContract } from "./contracts"
import { Balancer, DEX, UniswapV2, UniswapV3 } from "./dex"
import { Token } from "./token"
import { getPoolId } from "./utils/balancer"
import abi from "../abi.json"
import { bmath } from "@balancer-labs/sor"
import { BN, fromBN, toBN } from "./utils/bn"
import { Pool as UniV3Pool } from "@uniswap/v3-sdk"
import cfg from '../config.json'


export abstract class Pool {
    readonly id: string
    readonly dex: DEX
    readonly token0: Token
    readonly token1: Token
    readonly contract: Contract
    lastChangeBlock: number

    abstract hasValue: () => boolean
    abstract price0: () => BigNumber | undefined
    abstract price1: () => BigNumber | undefined

    constructor(dex: DEX, token0: Token, token1: Token, contract: Contract) {
        this.id = Pool.id(dex.name, token0.address, token1.address)
        this.dex = dex
        this.token0 = token0
        this.token1 = token1
        this.contract = contract
        this.lastChangeBlock = 0
    }

    static id: (dexName: string, token0: string, token1: string) => string 
        = (d, t0, t1) => '_id_' + d + t0 + t1

    name(): string {
        return `${this.dex.name}-${this.token0.symbol}/${this.token1.symbol}`
    }
}


export class UniswapV2Pool extends Pool {
    contract: UniswapPairContract
    balance0: BigNumber | undefined
    balance1: BigNumber | undefined
    
    constructor(dex: UniswapV2, token0: Token, token1: Token, contract: UniswapPairContract) {
        super(dex, token0, token1, contract)

        this.contract = contract
    }

    hasValue = () => !!this.balance0 && !!this.balance1

    price0 = () => {
        if (!this.hasValue) return
        return this.balance1!.mul(BigNumber.from(10).pow(this.token0.decimals)).div(this.balance0!)
    }

    price1 = () => {
        if (!this.hasValue) return
        return this.balance0!.mul(BigNumber.from(10).pow(this.token1.decimals)).div(this.balance1!)
    }

    updateReserves(balance0: BigNumber, balance1: BigNumber, block: number): void {
        this.balance0 = balance0
        this.balance1 = balance1
        this.lastChangeBlock = block
    }
}

export class BalancerPool extends Pool {
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

    hasValue = () => !!this.balance0 && !!this.balance1
    
    price0 = () => {
        if (!this.hasValue) return
        
        const d0 = 18 - this.token0.decimals
        const d1 = 18 - this.token1.decimals

        const price = bmath.calcSpotPrice(toBN(this.balance1!, d1), toBN(this.weight1), toBN(this.balance0!, d0), toBN(this.weight0), new BN(0))
        return fromBN(price, d1)
    }

    price1 = () => {
        if (!this.hasValue) return
        
        const d0 = 18 - this.token0.decimals
        const d1 = 18 - this.token1.decimals

        const price = bmath.calcSpotPrice(toBN(this.balance0!, d0), toBN(this.weight0), toBN(this.balance1!, d1), toBN(this.weight1), new BN(0))
        return fromBN(price, d0)
    }

    updateReserves(balance0: BigNumber, balance1: BigNumber, block: number): void {
        this.balance0 = balance0
        this.balance1 = balance1
        this.lastChangeBlock = block
    }
}

export class UniswapV3Pool extends Pool {
    contract: UniV3PoolContract
    // TODO: add all props required to calc flashswap
    pool: UniV3Pool | undefined
    // balance0: BigNumber | undefined
    // balance1: BigNumber | undefined
    
    constructor(dex: UniswapV3, token0: Token, token1: Token, contract: UniV3PoolContract) {
        super(dex, token0, token1, contract)

        this.contract = contract

        // TODO: init pool from contract and/or The Graph API
    }

    hasValue = () => !!this.pool

    price0 = () => {
        if (!this.hasValue) return

        const p = this.pool!.token0Price        
        // TODO: convert @uniswap/v3-sdk/Price to BigNumber
        return undefined
    }

    price1 = () => {
        if (!this.hasValue) return

        const p = this.pool!.token1Price
        // TODO: convert @uniswap/v3-sdk/Price to BigNumber
        return undefined
    }

    // TODO: pass and update params
    updateReserves(block: number): void {
        // this.balance0 = balance0
        // this.balance1 = balance1
        this.lastChangeBlock = block
    }
}



export class PoolFactory {
    
    constructor() {
    }

    async makePool(dex: DEX, token0: Token, token1: Token): Promise<Pool | undefined> {
        return dex.protocol === 'UniswapV2'
            ? this.makeUniswapPool(dex, token0, token1)
            : (dex.protocol === 'BalancerV2'
                ? this.makeBalancerPool(dex, token0, token1)
                : this.makeUniswapV3Pool(dex, token0, token1)
            )
    }

    async makeUniswapPool(dex: UniswapV2, token0: Token, token1: Token): Promise<UniswapV2Pool | undefined> {
        // TODO: cache factory?
        var f = await ethers.getContractAt('@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory', dex.factory)
        var pairAddress = await f.getPair(token0.address, token1.address)
        if (pairAddress === '0x0000000000000000000000000000000000000000') return
        
        const c = await ethers.getContractAt('@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair', pairAddress) as UniswapPairContract
        return new UniswapV2Pool(dex, token0, token1, c)
    }

    async makeUniswapV3Pool(dex: UniswapV3, token0: Token, token1: Token): Promise<UniswapV3Pool | undefined> {
        // TODO: cache factory?
        var f = await ethers.getContractAt(abi.uniV3.factory, dex.factory)

        var poolAddress = await f.getPool(token0.address, token1.address, dex.fee)
        if (poolAddress === '0x0000000000000000000000000000000000000000') return
        
        const c = await ethers.getContractAt(abi.uniV3.pool, poolAddress) as UniV3PoolContract
        return new UniswapV3Pool(dex, token0, token1, c)
    }

    async makeBalancerPool(dex: Balancer, token0: Token, token1: Token): Promise<BalancerPool | undefined> {
        // TODO: cache vault
        const vault = await ethers.getContractAt(abi.balancer.vault, cfg.balancer.vault) as BalancerVaultContract
        const poolId = getPoolId(token0.address, token1.address)
        if (!poolId) return

        const [poolAddress] = await vault.getPool(poolId)
        if (poolAddress === '0x0000000000000000000000000000000000000000') return
        
        const pool = await ethers.getContractAt(abi.balancer.pool, poolAddress) as BalancerPoolContract
        const [weight0, weight1] = await pool.getNormalizedWeights()
        const fee = await pool.getSwapFeePercentage()
        
        return new BalancerPool(dex, token0, token1, poolId, weight0, weight1, fee, pool)
    }
    
}