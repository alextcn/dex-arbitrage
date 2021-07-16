
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

function reservesToPrice(reserveA, reserveB, decimalsA, decimalsB) {
    return {
        priceA: reserveB.mul(BigNumber.from(10).pow(decimalsA)).div(reserveA),
        priceB: reserveA.mul(BigNumber.from(10).pow(decimalsB)).div(reserveB)
    }
}

function diffPercent(value1, value2, decimals) {
    const d = BigNumber.from('10').pow(18)
    const diff = d.mul(value1).div(value2).sub(d).div(BigNumber.from('10').pow(18 - decimals))
    return ethers.utils.formatUnits(diff, decimals - 2)
}

// prints Uniswap pair contract price and reserves
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


module.exports = {
    reservesToPrice,
    getPairContract,
    printPairPrice,
    diffPercent,
    tokenInfo
}