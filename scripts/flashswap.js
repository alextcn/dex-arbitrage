
const runScript = require("./utils").runScript
const logBalance = require("./utils").logBalance
const addressEquals = require("./utils").addressEquals
const cfg = require('../config.json')

const flashswapAddress = '0x4826533B4897376654Bb4d4AD88B7faFD0C98528'
const daiAmountOut = '1000'

runScript(async function () {
    const senderAddress = await (await ethers.provider.getSigner()).getAddress()
    await logBalance(senderAddress, cfg.weth, cfg.dai)

    const uniFactory = await ethers.getContractAt('@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory', cfg.uniFactory)
    const pairAddress = await uniFactory.getPair(cfg.weth, cfg.dai)
    const pair = await ethers.getContractAt('@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair', pairAddress)
    
    const amount0 = addressEquals(await pair.token0(), cfg.dai) ? daiAmountOut : '0'
    const amount1 = addressEquals(await pair.token1(), cfg.dai) ? daiAmountOut : '0'
    const data = ethers.utils.randomBytes(2) // non-zero length random bytes are ok?

    console.log(`swapping:`)
    console.log(await pair.token0(), ethers.utils.parseUnits(amount0).toString())
    console.log(await pair.token1(), ethers.utils.parseUnits(amount1).toString())

    try {
        const tx = await pair.swap(ethers.utils.parseUnits(amount0), ethers.utils.parseUnits(amount1), flashswapAddress, data)
        const receipt = await tx.wait()
        console.log(`swap success: tx = ${receipt.transactionHash}`)
        await logBalance(senderAddress, cfg.weth, cfg.dai)
    } catch(error) {
        console.log(`swap error: ${error}`)
    }
    // gas used: 207256
    // fee: $3.53
})