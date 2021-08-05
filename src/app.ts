import { Balancer, UniswapV2, UniswapV3 } from "./dex"
import { logMinProfits, objectsToTokens, runApp } from "./utils/utils"
import cfg from '../config.json'
import tokenList from '../tokens.json'
import { ethers } from "hardhat"
import { buildRoute, Route } from "./route"
import { BalancerPool, Pool, PoolFactory, UniswapV2Pool, UniswapV3Pool } from "./pool"
import { BalancerVaultContract } from "./contracts"
import abi from '../abi.json'
import { logPool, logTrade } from "./utils/app"
import { BigNumber } from "ethers"



// ~ $5
const minProfits = new Map<string, BigNumber>()
// minProfits.set(cfg.WETH,      BigNumber.from('0002777778000000000'))
// minProfits.set(cfg.WBTC,      BigNumber.from('000016129')) // 8
// minProfits.set(cfg.USDT,      BigNumber.from('5000000')) // 6
// minProfits.set(cfg.USDC,      BigNumber.from('5000000')) // 6
// minProfits.set(cfg.DAI,       BigNumber.from('5000000000000000000'))
// minProfits.set(cfg.TOMOE,     BigNumber.from('2000000000000000000'))
// minProfits.set(cfg.BAL,       BigNumber.from('0300000000000000000'))
// minProfits.set(cfg.SUSHI,     BigNumber.from('0750000000000000000'))
// minProfits.set(cfg.SHIB, BigNumber.from('800000000000000000000000'))
// minProfits.set(cfg.COMP,      BigNumber.from('0014623731000000000'))
// minProfits.set(cfg.LINK,      BigNumber.from('0341296928000000000'))
// minProfits.set(cfg.UNI,       BigNumber.from('0316856781000000000'))
// minProfits.set(cfg.SAND,     BigNumber.from('11363636364000000000'))
// minProfits.set(cfg.CRV,       BigNumber.from('3715814507000000000'))
// minProfits.set(cfg.SNX,       BigNumber.from('0608272506000000000'))
// minProfits.set(cfg.MATIC,     BigNumber.from('6756756757000000000'))
// minProfits.set(cfg.GTC,       BigNumber.from('1000000000000000000'))
// minProfits.set(cfg.BAT,      BigNumber.from('10000000000000000000'))
// minProfits.set(cfg.FNK,       BigNumber.from('9259259259000000000'))
// minProfits.set(cfg.FEI,       BigNumber.from('1000000000000000000'))
// minProfits.set(cfg.AAVE,      BigNumber.from('0020876827000000000'))
// minProfits.set(cfg.PAR,       BigNumber.from('4000000000000000000'))


// // TODO: read from config
// const routeAddresses: string[][] = [
//     // WETH
//     [cfg.WETH, cfg.USDT],
//     [cfg.WETH, cfg.USDC],
//     [cfg.WETH, cfg.DAI],
//     [cfg.WETH, cfg.WBTC],
//     // WBTC
//     [cfg.WBTC, cfg.USDT],
//     [cfg.WBTC, cfg.USDC],
//     [cfg.WBTC, cfg.DAI],
//     // TOMOE
//     [cfg.TOMOE, cfg.WETH],
//     [cfg.TOMOE, cfg.USDT],
//     [cfg.TOMOE, cfg.USDC],
//     // other
//     [cfg.BAL, cfg.WETH],
//     [cfg.PAR, cfg.USDC],
//     [cfg.PAR, cfg.WETH],
//     [cfg.LINK, cfg.WETH],
//     [cfg.COMP, cfg.WETH],
//     [cfg.UNI, cfg.WETH],
//     [cfg.MATIC, cfg.WETH],
//     [cfg.GTC, cfg.WETH],
//     [cfg.BAT, cfg.WETH],
//     [cfg.SUSHI, cfg.WETH],

//     [cfg.FNK, cfg.USDT],
//     [cfg.FEI, cfg.WETH],
//     [cfg.SHIB, cfg.WETH],
//     [cfg.SAND, cfg.WETH],
//     [cfg.AAVE, cfg.WETH],
//     [cfg.SNX, cfg.WETH],
//     [cfg.CRV, cfg.WETH],
// ]

// TODO: move to polygon config
const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
const DAI = '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
const WETH = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
const WBTC = '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'
const WMATIC = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'
const AAVE = '0xD6DF932A45C0f255f85145f286eA0b292B21C90B'
const LINK = '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39'
const GHST = '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7'
const QUICK = '0x831753DD7087CaC61aB5644b308642cc1c33Dc13'
const routeAddresses: string[][] = [
    [USDC, WETH],
    [WMATIC, WETH],
    [WBTC, WETH],
    [WETH, USDT],
    [WETH, AAVE],
    [WMATIC, USDC],
    [LINK, WETH],
    [WBTC, USDC],
    [WETH, DAI],
    [WMATIC, QUICK],
    [GHST, WETH]
]


// const uniswap: UniswapV2 = {
//     name: 'Uniswap',
//     protocol: 'UniswapV2',
//     factory: cfg.uni.factory,
//     router: cfg.uni.router
// }
// const sushiswap: UniswapV2 = {
//     name: 'Sushiswap',
//     protocol: 'UniswapV2',
//     factory: cfg.sushi.factory,
//     router: cfg.sushi.router
// }
// const lua: UniswapV2 = {
//     name: 'LuaSwap',
//     protocol: 'UniswapV2',
//     factory: cfg.lua.factory,
//     router: cfg.lua.router
// }
// const balancer: Balancer = {
//     name: 'Balancer',
//     protocol: 'BalancerV2',
//     vault: cfg.balancer.vault
// }
// const uniswapV3: UniswapV3 = {
//     name: 'Uniswap V3',
//     protocol: 'UniswapV3',
//     factory: cfg.uniV3.factory,
//     fee: 3000 // only scan for 0.3%-fee pools atm
// }
const sushiswap: UniswapV2 = {
    name: 'Sushiswap',
    protocol: 'UniswapV2',
    factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
    router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
}
const quickswap: UniswapV2 = {
    name: 'Quickswap',
    protocol: 'UniswapV2',
    factory:'0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'
}


// const exchanges = [
//     [uniswap, sushiswap],
//     [uniswap, balancer],
//     [sushiswap, balancer],
//     [lua, uniswap],
//     [lua, sushiswap],
//     [lua, balancer],
//     // Uniswap V3
//     [uniswap, uniswapV3],
//     [sushiswap, uniswapV3],
//     [lua, uniswapV3],
//     // [balancer, uniswapV3] // profit function not supported yet for this pair of DEXs
// ]
const exchanges = [
    [sushiswap, quickswap]
]


async function initPoolsAndRoutes(): Promise<[Map<string, Pool>, Route[]]> {
    const tokens = objectsToTokens(Object.values(tokenList))
    const pools: Map<string, Pool> = new Map()
    const routes: Route[] = []

    // logMinProfits(tokens, minProfits)

    const poolFactory = new PoolFactory()

    for (const [dexFrom, dexTo] of exchanges) {
        await Promise.all(routeAddresses.map(async ([_token0, _token1]) => {
            const [t0, t1] = _token0.toLowerCase() < _token1.toLowerCase() ? [_token0, _token1] : [_token1, _token0]
            const token0 = tokens.get(t0)!
            const token1 = tokens.get(t1)!
            
            const idFrom = Pool.id(dexFrom.name, token0.address, token1.address)
            if (!pools.has(idFrom)) {
                const pool = await poolFactory.makePool(dexFrom, token0, token1)
                if (pool) pools.set(idFrom, pool)
                else console.log(`[-] [${dexFrom.name}->${dexTo.name}] ${token0.symbol}/${token1.symbol} – no pair on ${dexFrom.name}`)
            }
            const poolFrom = pools.get(idFrom)

            const idTo = Pool.id(dexTo.name, token0.address, token1.address)
            if (!pools.has(idTo)) {
                const pool = await poolFactory.makePool(dexTo, token0, token1)
                if (pool) pools.set(idTo, pool)
                else console.log(`[-] [${dexFrom.name}->${dexTo.name}] ${token0.symbol}/${token1.symbol} – no pair on ${dexTo.name}`)
            }
            const poolTo = pools.get(idTo)

            if (!poolFrom || !poolTo) return
            
            const route = buildRoute(poolFrom, poolTo)
            routes.push(route)
            
            console.log(`[+] ${route.name()}`)
        }))
        
    }
    return [pools, routes]
}

async function main() {
    const [pools, routes] = await initPoolsAndRoutes()
    console.log(`${pools.size} pools and ${routes.length} routes initialized`)
    
    // TODO: fix async processing
    ethers.provider.on('block', async function (blockNumber) {
        console.log(`#${blockNumber} ---------------------------`)

        // update pools
        await Promise.all(Array.from(pools).map(async ([, pool]) => {
            // TODO: what block number to pass?
            if (pool instanceof UniswapV2Pool) {
                const [reserve0, reserve1, blockTimestampLast] = await pool.contract.getReserves()
                pool.updateReserves(reserve0, reserve1, blockNumber)
            } if (pool instanceof BalancerPool) {
                const vault = await ethers.getContractAt(abi.balancer.vault, cfg.balancer.vault) as BalancerVaultContract
                const [, [balance0, balance1], lastChangeBlock] = await vault.getPoolTokens(pool.poolId)
                pool.updateReserves(balance0, balance1, blockNumber)
            } if (pool instanceof UniswapV3Pool) {
                // TODO: 1. get updated contract data: pool.contract.slot0()
                // TODO: 2. update pool internal data: pool.updateReserves(...)
            }
            // logPool(pool)
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
            logPool(x.route.poolFrom, undefined, '                       ')
            logPool(x.route.poolTo, undefined, '                       ')
            console.log('————————————————————————')
        })

        // execute flashswap
    })
}

runApp(main)