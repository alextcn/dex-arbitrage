import { BigNumber, Contract } from "ethers";


export interface UniswapPairContract extends Contract {
    getReserves: () => Promise<[reserve0: BigNumber, reserve1: BigNumber, blockTimestampLast: number]>
}

export interface UniV3PoolContract extends Contract {
    // TODO: add methods
}

export interface BalancerVaultContract extends Contract {
    getPool: (poolId: string) => Promise<[address: string]>
    getPoolTokens: (poolId: string) => Promise<[tokens: string[], balances: BigNumber[], lastChangeBlock: number]>
}

export interface BalancerPoolContract extends Contract {
    getNormalizedWeights: () => Promise<BigNumber[]>
    getSwapFeePercentage: () => Promise<BigNumber>
}