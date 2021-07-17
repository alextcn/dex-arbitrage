import { DEX } from "./dex"
import { objectsToTokens, runApp } from "./utils/utils"
import cfg from '../config.json'
import tokenList from '../tokens.json'
import { ethers } from "hardhat"
import { buildRoute, Route } from "./route"
import { BalancerPair, Pair, PairFactory, UniswapPair } from "./pair"
import { BalancerVaultContract, UniswapPairContract } from "./contracts"
import * as abi from "../abi/balancer"
import { logTrade } from "./utils/app"


var senderAddress: string

// TODO: read from config
const routeAddresses: string[][] = [
    // WETH
    [cfg.WETH, cfg.USDT],
    // // [cfg.WETH, cfg.USDC],
    [cfg.WETH, cfg.DAI],
    [cfg.WETH, cfg.WBTC],
    // WBTC
    // [cfg.WBTC, cfg.USDT], // empty pool on sushi
    // [cfg.WBTC, cfg.USDC], // no pair on sushi
    // [cfg.WBTC, cfg.DAI], // no pair on sushi
    // other
    // [cfg.FNK, cfg.USDT], // no pair on sushi
    // [cfg.FEI, cfg.WETH], // no pair on sushi    
    [cfg.SHIB, cfg.WETH],
    [cfg.UNI, cfg.WETH],
    // [cfg.SAND, cfg.WETH], // no pair on sushi
    [cfg.AAVE, cfg.WETH],
    [cfg.LINK, cfg.WETH],
    [cfg.SNX, cfg.WETH],
    [cfg.CRV, cfg.WETH],
    [cfg.COMP, cfg.WETH]
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
    [uniswap, balancer],
    [sushiswap, balancer]
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
                else console.log(`[-] [${dexFrom.name}->${dexTo.name}] ${token0.symbol}/${token1.symbol} – no pair for ${dexFrom.name}`)
            }
            const pairFrom = pairs.get(idFrom)

            const idTo = Pair.id(dexTo.name, token0.address, token1.address)
            if (!pairs.has(idTo)) {
                const pair = await pairFactory.makePair(dexTo, token0, token1)
                if (pair) pairs.set(idTo, pair)
                else console.log(`[-] [${dexFrom.name}->${dexTo.name}] ${token0.symbol}/${token1.symbol} – no pair for ${dexTo.name}`)
            }
            const pairTo = pairs.get(idTo)

            if (!pairFrom || !pairTo) return
            
            const route = buildRoute(pairFrom, pairTo)
            routes.push(route)
            
            console.log(`[+] ${route.name()}`)
        }))
        
    }
    console.log(`${pairs.size} pairs and ${routes.length} routes initialized`)

    // TODO: fix async processing
    ethers.provider.on('block', async function (blockNumber) {
        console.log(`#${blockNumber} ---------------------------`)

        // update pairs
        await Promise.all(Array.from(pairs).map(async ([, pair]) => {
            // TODO: what block number to pass?
            if (pair instanceof UniswapPair) {
                const [reserve0, reserve1, blockTimestampLast] = await pair.contract.getReserves()
                pair.updateReserves(reserve0, reserve1, blockNumber)
            } if (pair instanceof BalancerPair) {
                const [, [balance0, balance1], lastChangeBlock] = await vault.getPoolTokens(pair.poolId)
                pair.updateReserves(balance0, balance1, blockNumber)
            }
        }))

        // check routes for profitable trades
        const trades = routes.map((route) => {
            const trade = route.calculateTrade()
            return { route: route, trade: trade }
        })
        .filter((x) => x.trade.profit.gt(0))

        // log profitable trades
        trades.forEach((x) => logTrade(blockNumber, x.route, x.trade))

        // execute flashswap
    })
}

runApp(main)