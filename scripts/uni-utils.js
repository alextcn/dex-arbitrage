
const { BigNumber } = require("ethers")

// returns Uniswap pair contract
async function getPairContract(factoryAddress, tokenAAddress, tokenBAddress) {
    var factory = await ethers.getContractAt('@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory', factoryAddress)
    var pairAddress = await factory.getPair(tokenAAddress, tokenBAddress)
    return await ethers.getContractAt('@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair', pairAddress)
}

// returns token info object
async function tokenInfo(tokenAddress) {
    const token = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', tokenAddress)
    return {
        address: tokenAddress,
        name: await token.name(),
        symbol: await token.symbol(),
        decimals: await token.decimals(),
        format: function (amount, withSymbol) {
            const s = ethers.utils.formatUnits(amount, this.decimals)
            if (withSymbol) return `${s} ${this.symbol}`
            return s
        }
    }
}

// print Uniswap pair contract price and reserves
async function printPairPrice(factoryAddress, _token0Address, _token1Address) {
    const pair = await getPairContract(factoryAddress, _token0Address, _token1Address)

    const [token0Address, token1Address] = (await pair.token0() == _token0Address) ? [_token0Address, _token1Address] : [_token1Address, _token0Address]
    const token0 = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', token0Address)
    const token1 = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', token1Address)
    const decimals0 = await token0.decimals()
    const decimals1 = await token1.decimals()

    const [_reserve0, _reserve1] = await pair.getReserves()
    const reserve0 = (await pair.token0() == token0Address) ? _reserve0 : _reserve1
    const reserve1 = (await pair.token0() == token0Address) ? _reserve1 : _reserve0
    
    // TODO: use exact decimals for each price
    const floatingPoint = decimals0 > decimals1 ? decimals0 : decimals1
    const price0 = reserve1.mul(BigNumber.from(10).pow(decimals0+floatingPoint)).div(reserve0.mul(BigNumber.from(10).pow(decimals1)))
    const price1 = reserve0.mul(BigNumber.from(10).pow(decimals1+floatingPoint)).div(reserve1.mul(BigNumber.from(10).pow(decimals0)))
    
    console.log(`1 ${await token0.symbol()} = ${ethers.utils.formatUnits(price0, floatingPoint)} ${await token1.symbol()}
1 ${await token1.symbol()} = ${ethers.utils.formatUnits(price1, floatingPoint)} ${await token0.symbol()}
reserves = [${ethers.utils.formatUnits(reserve0, decimals0)}, ${ethers.utils.formatUnits(reserve1, decimals1)}]`)
}


// ###########################################
// ################### FIX ###################
// ###########################################

// TODO: improve precision
// pair is IUniswapV2Pair contract
async function getPairPrice(pair) {
    const [reserveA, reserveB] = await pair.getReserves()
    return {
        reserveA: reserveA,
        reserveB: reserveB,
        priceA: reserveB.div(reserveA), // TODO: is that correct? no
        priceB: reserveA.div(reserveB), // TODO: is that correct? no
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

// ###########################################
// ###########################################
// ###########################################



module.exports = {
    getPairContract,
    printPairPrice,
    getPairPrice,
    priceDiffPercent,
    tokenInfo
}