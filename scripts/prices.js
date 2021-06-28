const { BigNumber } = require("ethers")

const uniFactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
const sushiFactoryAddress = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'
const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
// const wbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'

// TODO: export as a function
async function main() {
    var factory = await ethers.getContractAt(
        '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory',
        uniFactoryAddress
    )
    var pairAddress = await factory.getPair(wethAddress, daiAddress)
    var pair = await ethers.getContractAt(
        '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair',
        pairAddress
    )
    var [reserve0, reserve1] = await pair.getReserves()
    // var price = reserve1.div(reserve0).div(BigNumber.from(10).pow(10)).toString()
    var price = reserve0.div(reserve1).toString()
    console.log(`Uniswap WETH/DAI price: ${price} [${ethers.utils.formatUnits(reserve0)}, ${ethers.utils.formatUnits(reserve1)}]`)


    var factory = await ethers.getContractAt(
        '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory',
        sushiFactoryAddress
    )
    var pairAddress = await factory.getPair(wethAddress, daiAddress)
    var pair = await ethers.getContractAt(
        '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair',
        pairAddress
    )
    var [reserve0, reserve1] = await pair.getReserves()
    // price = reserve1.div(reserve0).div(BigNumber.from(10).pow(10)).toString()
    price = reserve0.div(reserve1).toString()
    console.log(`Sushiswap WETH/DAI price: ${price} [${ethers.utils.formatUnits(reserve0)}, ${ethers.utils.formatUnits(reserve1)}]`)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })