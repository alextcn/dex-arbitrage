const cfg = require("../config.json")
const { printPairPrice } = require("./uni-utils")
const { runScript, logBalance } = require("./utils")

const swapAddress = '0x70e0bA845a1A0F2DA3359C97E0285013525FFC49'
const holderAddress = '0x82810e81cad10b8032d39758c8dba3ba47ad7092'

const amount = '100000'

runScript(async function () {
    await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [holderAddress] })
    const signer = await ethers.provider.getSigner(holderAddress)
    // await logBalance(holderAddress, cfg.WETH, cfg.DAI)

    const Swap = await ethers.getContractFactory('Swap')
    const swap = await Swap.attach(swapAddress)

    const dai = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', cfg.DAI)
    await (await dai.connect(signer).approve(swap.address, ethers.utils.parseUnits(amount))).wait()

    console.log(`Swapping ${amount} DAI for WETH by ${holderAddress}...`)
    try {
        await (await swap.connect(signer).swapToken0(ethers.utils.parseUnits(amount))).wait()
        console.log(`Swap succeeded!`)
        await printPairPrice(cfg.uniFactory, cfg.WETH, cfg.DAI)
    } catch (error) {
        console.log(`Swap failed: ${error}`)
    }
})