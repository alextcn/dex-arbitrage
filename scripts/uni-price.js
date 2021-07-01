
const { runApp } = require("./utils")
const cfg = require('../config.json')
const { ChainId, Token, Trade, Route, Fetcher, TokenAmount, TradeType } = require("@uniswap/sdk")
const { ethers } = require("hardhat")

const DAI = new Token(ChainId.MAINNET, cfg.DAI, 18)
const WETH = new Token(ChainId.MAINNET, cfg.WETH, 18)

// ethers is injected by hardhat
async function main() {
    ethers.provider.on("block", async (blockNumber) => {
        const pair = await Fetcher.fetchPairData(DAI, WETH, ethers.provider)
        const route = new Route([pair], WETH)
        const price = route.midPrice.toSignificant(8)

        console.log(`#${blockNumber}: WETH/DAI = ${price}`)
    })
}

runApp(main)