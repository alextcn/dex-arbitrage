const { expect } = require("chai")
const { BigNumber } = require("ethers")
const utils = require("../scripts/utils")

// const flashswapAddress = '0x9d4454B023096f34B160D6B654540c56A1F81688'

const uniFactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
const sushiFactoryAddress = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'
const uniRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const sushiRouterAddress = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'

const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'


describe("Flashswap", function() {
    const amountBorrowWeth = '5'

    var flashswapAddress
    var pair

    before(async function () {
        const FlashSwap = await ethers.getContractFactory('FlashSwap')
        console.log('Deploying FlashSwap...')
        const flashswap = await FlashSwap.deploy(uniFactoryAddress, sushiFactoryAddress, sushiRouterAddress)
        flashswapAddress = (await flashswap.deployed()).address
        console.log('FlashSwap deployed to:', flashswapAddress)

        const uniFactory = await ethers.getContractAt(
            '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory',
            uniFactoryAddress
        )
        const pairAddress = await uniFactory.getPair(wethAddress, daiAddress)
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
        const signer = await ethers.provider.getSigner()
        const senderAddress = await signer.getAddress()

        await utils.logBalance(senderAddress, wethAddress, daiAddress)

        const amount0 = utils.addressEquals(await pair.token0(), wethAddress) ? amountBorrowWeth : '0'
        const amount1 = utils.addressEquals(await pair.token1(), wethAddress) ? amountBorrowWeth : '0'
        const data = ethers.utils.randomBytes(2) // non-zero length random bytes are ok?

        console.log(`swapping:`)
        console.log(await pair.token0(), ethers.utils.parseUnits(amount0).toString())
        console.log(await pair.token1(), ethers.utils.parseUnits(amount1).toString())
        try {
            const tx = await pair.swap(ethers.utils.parseUnits(amount0), ethers.utils.parseUnits(amount1), flashswapAddress, data)
            const receipt = await tx.wait()
            console.log(`swap success: tx = ${receipt.transactionHash}`)
            await utils.logBalance(senderAddress, wethAddress, daiAddress)
        } catch(error) {
            console.log(`swap error: ${error}`)
        }
    })
})
