import { DEX } from "./dex"
import { objectsToTokens, runApp } from "./utils/utils"
import cfg from '../config.json'
import tokenList from '../tokens.json'
import { ethers } from "hardhat"
import { buildRoute, Route } from "./route"
import { Token } from "./token"
import { BigNumber } from "ethers"


var senderAddress: string

// TODO: read from config
const routeAddresses: string[][] = [
    // WETH
    [cfg.WETH, cfg.USDT],
    [cfg.WETH, cfg.USDC],
    // [cfg.WETH, cfg.DAI],
    // [cfg.WETH, cfg.WBTC],
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

// const routes: Route[] = [
//     {
//         dexFrom: uniswap,
//         dexTo: sushiswap
//     }
    
//     [cfg.WETH, cfg.USDC],
//     [cfg.CRV, cfg.WETH],
//     [cfg.COMP, cfg.WETH]
// ]


async function main() {
    senderAddress = await (ethers.provider.getSigner()).getAddress()
    const tokens = objectsToTokens(Object.values(tokenList))
    
    
    exchanges.forEach(function([dexFrom, dexTo]) {
        routeAddresses.forEach(function([_token0, _token1]) {
            const [t0, t1] = _token0.toLowerCase() < _token1.toLowerCase() ? [_token0, _token1] : [_token1, _token0]
            const token0 = tokens.get(t0)!
            const token1 = tokens.get(t1)!
            
            // TODO: build routes
        })
    })

    
    // // build routes
    // const routes = []
    // for (var i = 0; i < routeAddresses.length; i++) {
    //     const [tokenAAddress, tokenBAddress] = routeAddresses[i]
    //     const route = await buildRoute(tokenAAddress, tokenBAddress)
    //     routes.push(route)
    //     console.log(`route[${i}]: [${route.tokenAInfo.symbol}/${route.tokenBInfo.symbol}]`)
    // }


    ethers.provider.on('block', async function (blockNumber) {
        // routes.forEach(route => checkRoute(blockNumber, route))
    })
}

runApp(main)