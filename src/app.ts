import { DEX, Uniswap } from "./dex"
import { objectsToTokens, runApp } from "./utils/utils"
import cfg from '../config.json'
import tokenList from '../tokens.json'
import { ethers } from "hardhat"
import { buildRoute, Route } from "./route"
import { Token } from "./token"
import { BigNumber, Contract } from "ethers"
import { BalancerPair, Pair, PairFactory, UniswapPair } from "./pair"
import { BalancerPoolContract, BalancerVaultContract, UniswapPairContract } from "./contracts"
import * as abi from "../abi/balancer"
import { getPoolId } from "./utils/balancer"


var senderAddress: string

// TODO: read from config
const routeAddresses: string[][] = [
    // WETH
    [cfg.WETH, cfg.USDT],
    [cfg.WETH, cfg.USDC],
    [cfg.WETH, cfg.DAI],
    [cfg.WETH, cfg.WBTC],
    // // WBTC
    // // [cfg.WBTC, cfg.USDT], // empty pool on sushi
    // // [cfg.WBTC, cfg.USDC], // no pair on sushi
    // // [cfg.WBTC, cfg.DAI], // no pair on sushi
    // // other
    // // [cfg.FNK, cfg.USDT], // no pair on sushi
    // // [cfg.FEI, cfg.WETH], // no pair on sushi    
    // [cfg.SHIB, cfg.WETH],
    // [cfg.UNI, cfg.WETH],
    // // [cfg.SAND, cfg.WETH], // no pair on sushi
    // [cfg.AAVE, cfg.WETH],
    // [cfg.LINK, cfg.WETH],
    // [cfg.SNX, cfg.WETH],
    // [cfg.CRV, cfg.WETH],
    // [cfg.COMP, cfg.WETH]
]


const uniswap: DEX = {
    name: 'Uniswap',
    protocol: 'UniswapV2',
    factory: cfg.uni.factory,
    router: cfg.uni.router
}
const sushiswap: DEX = {
    name: 'Sushiswap',
    protocol: 'UniswapV2',
    factory: cfg.sushi.factory,
    router: cfg.sushi.router
}
const balancer: DEX = {
    name: 'Balancer',
    protocol: 'BalancerV2',
    vault: cfg.balancer.vault
}

const exchanges = [
    [uniswap, sushiswap],
    [uniswap, balancer]
]

async function main() {
    senderAddress = await (ethers.provider.getSigner()).getAddress()
    const tokens = objectsToTokens(Object.values(tokenList))

    const vault = await ethers.getContractAt(abi.vault, cfg.balancer.vault) as BalancerVaultContract
    const pairFactory = new PairFactory(vault)

    const pairs: Map<string, Pair> = new Map()
    const routes: Route[] = []

    for (const [dexFrom, dexTo] of exchanges) {
        await Promise.all(routeAddresses.map(async ([_token0, _token1]) => {
            const [t0, t1] = _token0.toLowerCase() < _token1.toLowerCase() ? [_token0, _token1] : [_token1, _token0]
            const token0 = tokens.get(t0)!
            const token1 = tokens.get(t1)!
            
            const idFrom = Pair.id(dexFrom.name, token0.address, token1.address)
            if (!pairs.has(idFrom)) {
                const pair = await pairFactory.makePair(dexFrom, token0, token1)
                if (pair) pairs.set(idFrom, pair)
                else console.log(`route[${dexFrom.name}->${dexTo.name}] ${token0.symbol}/${token1.symbol} --- missing, no pair for ${dexFrom.name}`)
            }
            const pairFrom = pairs.get(idFrom)

            const idTo = Pair.id(dexTo.name, token0.address, token1.address)
            if (!pairs.has(idTo)) {
                const pair = await pairFactory.makePair(dexTo, token0, token1)
                if (pair) pairs.set(idTo, pair)
                else console.log(`route[${dexFrom.name}->${dexTo.name}] ${token0.symbol}/${token1.symbol} [X] skipping, no pair for ${dexTo.name}`)
            }
            const pairTo = pairs.get(idTo)

            if (!pairFrom || !pairTo) return
            
            // TODO: build routes from pairs
            console.log(`route[${dexFrom.name}->${dexTo.name}] ${token0.symbol}/${token1.symbol}`)
        }))
        
    }
    console.log('started')


    // ethers.provider.on('block', async function (blockNumber) {
    //     // 1. update pool values of all pairs
    //     // TODO: ...

    //     // 2. check routes for profit
    //     // TODO: ...
    // })
}

runApp(main)