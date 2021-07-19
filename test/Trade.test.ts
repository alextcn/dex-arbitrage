import { expect } from "chai"
import { ethers } from "hardhat"
import { BigNumber } from "ethers"
import { flashswapProfitUniToUni, flashswapProfitUniToBalancer, tradeSizeUniToUni, tradeSizeUniToBalancer } from '../src/trade'
import { BN, fromBN, toBN } from "../src/utils/bn"
import { bmath } from "@balancer-labs/sor"
import { uniPrice } from '../src/utils/dex'
import { DEX, Uniswap, Balancer } from '../src/dex'
import { BalancerPair, UniswapPair } from '../src/pair'
import cfg from '../config.json'
import { Token } from "../src/token"
import { BalancerPoolContract, UniswapPairContract } from "../src/contracts"
import { logPair } from "../src/utils/app"


const uniswap: Uniswap = {
    name: 'Uniswap',
    protocol: 'UniswapV2',
    factory: cfg.uni.factory,
    router: cfg.uni.router
}
const balancer: Balancer = {
    name: 'Balancer',
    protocol: 'BalancerV2',
    vault: cfg.balancer.vault
}

const WETH = new Token('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 'Wrapped Ether', 'WETH', 18)
const USDC = new Token('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'USD Coin', 'USDC', 6)


describe("Trade USDC/WETH", function() {
    const uniPair0 = new UniswapPair(uniswap, USDC, WETH, {} as UniswapPairContract)
    uniPair0.updateReserves(BigNumber.from('166527132537660'), BigNumber.from('71672677442879327142582'), 1)

    const uniPair1 = new UniswapPair(uniswap, USDC, WETH, {} as UniswapPairContract)
    uniPair1.updateReserves(BigNumber.from('32785426507532'), BigNumber.from('14534535488575865428516'), 1)


    const w0 = BigNumber.from('400000000000000000') // 40%
    const w1 = BigNumber.from('600000000000000000') // 60%
    const fee = BigNumber.from('2900000000000000') // 0.29%
    const balPool = new BalancerPair(balancer, USDC, WETH, '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a', w0, w1, fee, {} as BalancerPoolContract)    
    balPool.updateReserves(BigNumber.from('32353316570431'), BigNumber.from('21514991285824735138779'), 1)
    
    const amountBorrowUSDC = BigNumber.from('200000000000') // 200,000 USDC
    const amountBorrowWETH = BigNumber.from('500000000000000000000') // 500 WETH
    
    logPair(uniPair0)
    logPair(uniPair1)
    logPair(balPool)

    it('uni->uni usdc profit', async function () {
        const profit = flashswapProfitUniToUni(uniPair0, uniPair1, amountBorrowUSDC, true)
        expect(profit).to.equals(BigNumber.from('3256449224'))
    })

    it('uni->bal usdc profit', async function() {
        const profit = flashswapProfitUniToBalancer(uniPair0, balPool, amountBorrowUSDC, true)
        expect(profit).to.equals(BigNumber.from('3464315467'))
    })

    it('profit same', async function () {
        const balCopyPool = new BalancerPair(balancer, uniPair1.token0, uniPair1.token1, 'ZERO_ID',
            BigNumber.from('500000000000000000'), BigNumber.from('500000000000000000'), 
            BigNumber.from('3000000000000000'), {} as BalancerPoolContract
        )
        balCopyPool.updateReserves(uniPair1.balance0!, uniPair1.balance1!, 1)

        const uniToUniUSDCProfit = flashswapProfitUniToUni(uniPair0, uniPair1, amountBorrowUSDC, true)
        const uniToBalUSDCProfit = flashswapProfitUniToBalancer(uniPair0, balCopyPool, amountBorrowUSDC, true)

        const uniToUniWETHProfit = flashswapProfitUniToUni(uniPair0, uniPair1, amountBorrowWETH, false)
        const uniToBalWETHProfit = flashswapProfitUniToBalancer(uniPair0, balCopyPool, amountBorrowWETH, false)
        
        // two big number libs have different roundings
        const precision = 9
        const d = BigNumber.from(10).pow(18-precision)
        expect(uniToUniUSDCProfit.div(d)).to.equals(uniToBalUSDCProfit.div(d))
        expect(uniToUniWETHProfit.div(d)).to.equals(uniToBalWETHProfit.div(d))

        
        // const trade = tradeSizeUniToBalancer(uniPair0, balCopyPool)
        // const fmt: (x: BigNumber) => string = (x: BigNumber) => (trade.firstToken ? uniPair0.token0 : uniPair1.token1).format(x, true)
        // console.log(`trade size: borrow = ${fmt(trade.amountBorrow)}, profit = ${fmt(trade.profit)}`)
    })

    it('uni to uni weth profit', async function () {
        const profit = flashswapProfitUniToUni(uniPair0, uniPair1, amountBorrowWETH, false)
        expect(profit).to.equals(BigNumber.from('41128271134620992026').mul(-1))
    })
    it('uni to bal weth profit', async function () {
        const profit = flashswapProfitUniToBalancer(uniPair0, balPool, amountBorrowWETH, false)
        expect(profit).to.equals(BigNumber.from('38015905378381599413').mul(-1))
    })

    xit('trade size', async function () {
        // const isFirstToken = tradeSizeUniToUni(uniPair0, uniPair1).firstToken

        // const fmt: (x: BigNumber) => string = function(x: BigNumber) {
        //     return (isFirstToken ? uniPair0.token0 : uniPair1.token1).format(x, true)
        // }
        
        // // todo: binary search

        // // find optimal profit
        // const INIT_VALUE = BigNumber.from(1000000)
        // const MULTIPLIER = 2

        // var maxProfit = BigNumber.from(0)
        // const poolSize = isFirstToken ? uniPair0.balance0! : uniPair1.balance1! // TODO: take smaller pool size
        // for (var amountBorrow = INIT_VALUE; amountBorrow.lt(poolSize); amountBorrow = amountBorrow.mul(MULTIPLIER)) {
        //     const newProfit = flashswapProfitUniToUni(uniPair0, uniPair1, amountBorrow, isFirstToken)
        //     if (newProfit.gt(maxProfit)) {
        //         console.log(`borrow = ${fmt(amountBorrow)}, profit = ${fmt(newProfit)}`)
        //         maxProfit = newProfit
        //     } else break
        // }
        
        // // log
        // console.log(`pool size: ${fmt(poolSize)}`)
        // const smartTrade = tradeSizeUniToUni(uniPair0, uniPair1)
        // console.log(`smart trade: borrow = ${fmt(smartTrade.amountBorrow)}, profit = ${fmt(flashswapProfitUniToUni(uniPair0, uniPair1, smartTrade.amountBorrow, smartTrade.firstToken))}`)
    })
})