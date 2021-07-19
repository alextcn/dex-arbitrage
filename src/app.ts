import { Balancer, Uniswap } from "./dex"
import { logMinProfits, objectsToTokens, runApp } from "./utils/utils"
import cfg from '../config.json'
import tokenList from '../tokens.json'
import { ethers } from "hardhat"
import { buildRoute, Route } from "./route"
import { BalancerPair, Pair, PairFactory, UniswapPair } from "./pair"
import { BalancerVaultContract } from "./contracts"
import * as abi from "../abi/balancer"
import { logPair, logTrade } from "./utils/app"
import { BigNumber } from "ethers"



// ~ $5
const minProfits = new Map<string, BigNumber>()
minProfits.set(cfg.WETH,      BigNumber.from('0002777778000000000'))
minProfits.set(cfg.WBTC,      BigNumber.from('000016129')) // 8
minProfits.set(cfg.USDT,      BigNumber.from('5000000')) // 6
minProfits.set(cfg.USDC,      BigNumber.from('5000000')) // 6
minProfits.set(cfg.DAI,       BigNumber.from('5000000000000000000'))
minProfits.set(cfg.TOMOE,     BigNumber.from('2000000000000000000'))
minProfits.set(cfg.BAL,       BigNumber.from('0300000000000000000'))
minProfits.set(cfg.SUSHI,     BigNumber.from('0750000000000000000'))
minProfits.set(cfg.SHIB, BigNumber.from('800000000000000000000000'))
minProfits.set(cfg.COMP,      BigNumber.from('0014623731000000000'))
minProfits.set(cfg.LINK,      BigNumber.from('0341296928000000000'))
minProfits.set(cfg.UNI,       BigNumber.from('0316856781000000000'))
minProfits.set(cfg.SAND,     BigNumber.from('11363636364000000000'))
minProfits.set(cfg.CRV,       BigNumber.from('3715814507000000000'))
minProfits.set(cfg.SNX,       BigNumber.from('0608272506000000000'))
minProfits.set(cfg.MATIC,     BigNumber.from('6756756757000000000'))
minProfits.set(cfg.GTC,       BigNumber.from('1000000000000000000'))
minProfits.set(cfg.BAT,      BigNumber.from('10000000000000000000'))
minProfits.set(cfg.FNK,       BigNumber.from('9259259259000000000'))
minProfits.set(cfg.FEI,       BigNumber.from('1000000000000000000'))
minProfits.set(cfg.AAVE,      BigNumber.from('0020876827000000000'))


// TODO: read from config
const routeAddresses: string[][] = [
    // WETH
    [cfg.WETH, cfg.USDT],
    [cfg.WETH, cfg.USDC],
    [cfg.WETH, cfg.DAI],
    [cfg.WETH, cfg.WBTC],
    // WBTC
    [cfg.WBTC, cfg.USDT],
    [cfg.WBTC, cfg.USDC],
    [cfg.WBTC, cfg.DAI],
    // TOMOE
    [cfg.TOMOE, cfg.WETH],
    [cfg.TOMOE, cfg.USDT],
    [cfg.TOMOE, cfg.USDC],
    // other
    [cfg.BAL, cfg.WETH],
    [cfg.PAR, cfg.USDC],
    [cfg.PAR, cfg.WETH],
    [cfg.LINK, cfg.WETH],
    [cfg.COMP, cfg.WETH],
    [cfg.UNI, cfg.WETH],
    [cfg.MATIC, cfg.WETH],
    [cfg.GTC, cfg.WETH],
    [cfg.BAT, cfg.WETH],
    [cfg.SUSHI, cfg.WETH],

    [cfg.FNK, cfg.USDT],
    [cfg.FEI, cfg.WETH],
    [cfg.SHIB, cfg.WETH],
    [cfg.SAND, cfg.WETH],
    [cfg.AAVE, cfg.WETH],
    [cfg.SNX, cfg.WETH],
    [cfg.CRV, cfg.WETH],
]


const uniswap: Uniswap = {
    name: 'Uniswap',
    protocol: 'UniswapV2',
    factory: cfg.uni.factory,
    router: cfg.uni.router
}
const sushiswap: Uniswap = {
    name: 'Sushiswap',
    protocol: 'UniswapV2',
    factory: cfg.sushi.factory,
    router: cfg.sushi.router
}
const lua: Uniswap = {
    name: 'LuaSwap',
    protocol: 'UniswapV2',
    factory: cfg.lua.factory,
    router: cfg.lua.router
}
const balancer: Balancer = {
    name: 'Balancer',
    protocol: 'BalancerV2',
    vault: cfg.balancer.vault
}


const exchanges = [
    [uniswap, sushiswap],
    [uniswap, balancer],
    [sushiswap, balancer],
    [lua, uniswap],
    [lua, sushiswap],
    [lua, balancer]
]


async function initPairsAndRoutes(): Promise<[Map<string, Pair>, Route[]]> {
    const tokens = objectsToTokens(Object.values(tokenList))
    const pairs: Map<string, Pair> = new Map()
    const routes: Route[] = []

    // logMinProfits(tokens, minProfits)
    
    const vault = await ethers.getContractAt(abi.vault, cfg.balancer.vault) as BalancerVaultContract
    const pairFactory = new PairFactory(vault)

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
    return [pairs, routes]
}

async function main() {
    const [pairs, routes] = await initPairsAndRoutes()
    console.log(`${pairs.size} pairs and ${routes.length} routes initialized`)

    const vault = await ethers.getContractAt(abi.vault, cfg.balancer.vault) as BalancerVaultContract
    
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
            // logPair(pair)
        }))

        // check routes for profitable trades
        const trades = routes.map((route) => {
            const trade = route.calculateTrade()
            return { route: route, trade: trade }
        })
        .filter((x) => {
            const token = x.trade.firstToken ? x.route.token0 : x.route.token1
            const minProfit = minProfits.get(token.address)
            return x.trade.profit.gt(!!minProfit ? minProfit : 0)
        })

        // log profitable trades
        trades.forEach((x) => {
            logTrade(blockNumber, x.route, x.trade)
            logPair(x.route.pairFrom, undefined, '                       ')
            logPair(x.route.pairTo, undefined, '                       ')
            console.log('————————————————————————')
        })

        // execute flashswap
    })
}

runApp(main)