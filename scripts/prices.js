const { BigNumber } = require("ethers")
const cfg = require('../config.json')
const { getPairContract } = require("./uni-utils")

// TODO: export as a function
async function main() {
    var pair = await getPairContract(cfg.uni.factory, cfg.WETH, cfg.DAI)
    var [reserve0, reserve1] = await pair.getReserves()
    var price = reserve0.div(reserve1).toString()
    console.log(`Uniswap WETH/DAI price: ${price} [${ethers.utils.formatUnits(reserve0)}, ${ethers.utils.formatUnits(reserve1)}]`)

    var pair = await getPairContract(cfg.sushi.factory, cfg.WETH, cfg.DAI)
    var [reserve0, reserve1] = await pair.getReserves()
    price = reserve0.div(reserve1).toString()
    console.log(`Sushiswap WETH/DAI price: ${price} [${ethers.utils.formatUnits(reserve0)}, ${ethers.utils.formatUnits(reserve1)}]`)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })