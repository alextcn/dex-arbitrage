import { expect } from "chai"
import { ethers } from "hardhat"
import { BigNumber } from "ethers"
import { BalancerPool, UniswapPair, flashswapProfitUniToUni, flashswapProfitUniToBalancer, uniPrice } from '../scripts/x'
import { BN, fromBN, toBN } from "../scripts/bn"
import { bmath } from "@balancer-labs/sor"


describe("Trade", function() {
    const uniPair0: UniswapPair = {
        balance0: BigNumber.from('166527132537660000000000000'),
        balance1: BigNumber.from('71672677442879327142582'),
    }
    const uniPair1: UniswapPair = {
        balance0: BigNumber.from('32785426507532000000000000'),
        balance1: BigNumber.from('14534535488575865428516'),
    }
    const balPool: BalancerPool = {
        balance0: new BN('32353316570431271588389494'), // dai
        balance1: new BN('21514991285824735138779'), // weth
        weight0: new BN(40).multipliedBy(new BN(10).pow(16)), // 40%
        weight1: new BN(60).multipliedBy(new BN(10).pow(16)), // 60%
        fee: new BN(2900000000000000) // 0.29%
    }
    
    const amountBorrowDAI = BigNumber.from('200000000000000000000000') // 200,000 DAI
    const amountBorrowWETH = BigNumber.from('500000000000000000000') // 500 WETH


    const uni0EthPrice = uniPrice(uniPair0, false)
    console.log(`Uniswap0: 1 WETH = ${ethers.utils.formatUnits(uni0EthPrice)} DAI`)
    const uni1EthPrice = uniPrice(uniPair1, false)
    console.log(`Uniswap1: 1 WETH = ${ethers.utils.formatUnits(uni1EthPrice)} DAI`)
    const balEthPrice = bmath.calcSpotPrice(balPool.balance0, balPool.weight0, balPool.balance1, balPool.weight1, new BN(0))
    console.log(`Balancer: 1 WETH = ${ethers.utils.formatUnits(fromBN(balEthPrice))} DAI`)
    

    it('uni->uni dai profit', async function () {
        const profit = flashswapProfitUniToUni(uniPair0, uniPair1, amountBorrowDAI, true)
        expect(profit).to.equals(BigNumber.from('3256449224456700521210'))
    })

    it('uni->bal dai profit', async function() {
        const profit = flashswapProfitUniToBalancer(uniPair0, balPool, amountBorrowDAI, true)
        expect(profit).to.equals(BigNumber.from('3464315467513211751915'))
    })

    it('profit same', async function () {
        const balCopyPool: BalancerPool = {
            balance0: toBN(uniPair1.balance0), // dai
            balance1: toBN(uniPair1.balance1), // weth
            weight0: new BN(50).multipliedBy(new BN(10).pow(16)), // 50%
            weight1: new BN(50).multipliedBy(new BN(10).pow(16)), // 50%
            fee: new BN(3000000000000000) // 0.30%
        }

        const uniToUniDAIProfit = flashswapProfitUniToUni(uniPair0, uniPair1, amountBorrowDAI, true)
        const uniToBalDAIProfit = flashswapProfitUniToBalancer(uniPair0, balCopyPool, amountBorrowDAI, true)

        const uniToUniWETHProfit = flashswapProfitUniToUni(uniPair0, uniPair1, amountBorrowWETH, false)
        const uniToBalWETHProfit = flashswapProfitUniToBalancer(uniPair0, balCopyPool, amountBorrowWETH, false)
        
        // two big number libs have different roundings
        const precision = 10
        const d = BigNumber.from(10).pow(18-precision)
        expect(uniToUniDAIProfit.div(d)).to.equals(uniToBalDAIProfit.div(d))
        expect(uniToUniWETHProfit.div(d)).to.equals(uniToBalWETHProfit.div(d))
    })

    it('uni to uni weth profit', async function () {
        const profit = flashswapProfitUniToUni(uniPair0, uniPair1, amountBorrowWETH, false)
        expect(profit).to.equals(BigNumber.from('41128271134587974309').mul(-1))
    })
    it('uni to bal weth profit', async function () {
        const profit = flashswapProfitUniToBalancer(uniPair0, balPool, amountBorrowWETH, false)
        expect(profit).to.equals(BigNumber.from('38015905378376938659').mul(-1))
    })
})
