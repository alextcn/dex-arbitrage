import { expect } from "chai"
import { ethers } from "hardhat"
import { BigNumber, Contract, utils } from "ethers"
import { addressEquals, logBalance } from "../scripts/utils"
import cfg from '../config.json'


const uniFactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
const sushiRouterAddress = cfg.sushi.router
const wethAddress = cfg.WETH
const daiAddress = cfg.DAI


describe("Flashswap", function() {
    const amountBorrowWeth = '5'

    var flashswapAddress: string
    var pair: Contract

    before(async function () {
        const FlashSwap = await ethers.getContractFactory('FlashSwap')
        console.log('Deploying FlashSwap...')
        const flashswap = await FlashSwap.deploy(uniFactoryAddress)
        flashswapAddress = (await flashswap.deployed()).address
        console.log('FlashSwap deployed to:', flashswapAddress)

        const uniFactory = await ethers.getContractAt(
            '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory',
            uniFactoryAddress
        )
        const pairAddress = await uniFactory.getPair( wethAddress, daiAddress)
        pair = await ethers.getContractAt(
            '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair',
            pairAddress
        )
    })

    // beforeEach(async function () {
    //     this.box = await this.Box.deploy()
    //     await this.box.deployed()
    // })

    it('perform flashswap', async function () {
        const signer = ethers.provider.getSigner()
        const senderAddress = await signer.getAddress()

        await logBalance(senderAddress, wethAddress, daiAddress)

        const amount0 = addressEquals(await pair.token0(), wethAddress) ? amountBorrowWeth : '0'
        const amount1 = addressEquals(await pair.token1(), wethAddress) ? amountBorrowWeth : '0'
        const data = ethers.utils.defaultAbiCoder.encode(['address'], [sushiRouterAddress])

        console.log(`swapping:`)
        console.log(await pair.token0(), ethers.utils.parseUnits(amount0).toString())
        console.log(await pair.token1(), ethers.utils.parseUnits(amount1).toString())
        try {
            const tx = await pair.swap(ethers.utils.parseUnits(amount0), ethers.utils.parseUnits(amount1), flashswapAddress, data)
            const receipt = await tx.wait()
            console.log(`swap success: tx = ${receipt.transactionHash}`)
            await logBalance(senderAddress, wethAddress, daiAddress)
        } catch(error) {
            console.log(`swap error: ${error}`)
        }
    })
})
