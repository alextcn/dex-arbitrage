
const { addressEquals, logBalance, runScript } = require("./utils")
const { getPairContract } = require("./uni-utils")
const cfg = require('../config.json')

// FlashSwap.sol contract only supports flashswaps from actual Uniswap protocol.
// 'dexFromFactoryAddress' and 'dexToRouterAddress' must be the same as 
// in deployed FlashSwap.sol contract.
const flashswapAddress = '0x70e0bA845a1A0F2DA3359C97E0285013525FFC49'
const dexFromFactoryAddress = cfg.uniFactory
const dexToRouterAddress = cfg.sushiRouter

const token0Address = cfg.DAI
const token1Address = cfg.WETH
const tokenBorrowAddress = token0Address
const amountBorrow = '1000'


runScript(async function () {
    const senderAddress = await (await ethers.provider.getSigner()).getAddress()
    await logBalance(senderAddress, token0Address, token1Address)

    const pair = await getPairContract(dexFromFactoryAddress, token0Address, token1Address)
    const amount0 = addressEquals(await pair.token0(), tokenBorrowAddress) ? amountBorrow : '0'
    const amount1 = addressEquals(await pair.token1(), tokenBorrowAddress) ? amountBorrow : '0'
    const data = ethers.utils.randomBytes(2) // non-zero length random bytes are ok?

    const tokenBorrow = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', tokenBorrowAddress)
    console.log(`Borrowing ${amountBorrow} ${await tokenBorrow.symbol()} to flashswap...`)

    try {
        const tx = await pair.swap(ethers.utils.parseUnits(amount0), ethers.utils.parseUnits(amount1), flashswapAddress, data)
        const receipt = await tx.wait()
        console.log(`Flashswap success: tx = ${receipt.transactionHash}`)
        await logBalance(senderAddress, token0Address, token1Address)
    } catch(error) {
        console.log(`Flashswap error: ${error}`)
    }
})