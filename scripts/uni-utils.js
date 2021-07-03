
const { BigNumber } = require("ethers")

// returns Uniswap pair contract
async function getPairContract(factoryAddress, tokenAAddress, tokenBAddress) {
    var factory = await ethers.getContractAt('@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory', factoryAddress)
    var pairAddress = await factory.getPair(tokenAAddress, tokenBAddress)
    return await ethers.getContractAt('@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair', pairAddress)
}

// print Uniswap pair contract price and reserves
async function printPairPrice(factoryAddress, token0Address, token1Address) {
    var pair = await getPairContract(factoryAddress, token0Address, token1Address)
    var [reserve0, reserve1] = await pair.getReserves()

    price = reserve0.div(reserve1).toString()
    const token0 = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', token0Address)
    const token1 = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', token1Address)
    
    console.log(`1 ${await token0.symbol()} = ${price} ${await token1.symbol()} (${ethers.utils.formatUnits(reserve0)}, ${ethers.utils.formatUnits(reserve1)})`)
}

// TODO: improve precision
// pair is IUniswapV2Pair contract
async function getPairPrice(pair) {
    const [reserveA, reserveB] = await pair.getReserves()
    return {
        reserveA: reserveA,
        reserveB: reserveB,
        priceA: reserveB.div(reserveA), // TODO: is that correct?
        priceB: reserveA.div(reserveB), // TODO: is that correct?
        priceBFormatted: reservesToPrice(reserveA, reserveB, 4)
    }
}

function reservesToPrice(reserveA, reserveB, precision) {
    const p = reserveA.mul(BigNumber.from(10).pow(precision)).div(reserveB)
    return ethers.utils.formatUnits(p, precision)
}

function priceDiffPercent(price0, price1) {
    const precision = 4
    const d = BigNumber.from(10).pow(precision)

    const priceDiff = d.mul(price0.reserveA).mul(price1.reserveB).div(price0.reserveB).div(price1.reserveA).sub(d)
    return ethers.utils.formatUnits(priceDiff, precision - 2)
}


module.exports = {
    getPairContract,
    printPairPrice,
    getPairPrice,
    priceDiffPercent
}