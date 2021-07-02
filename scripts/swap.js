const config = require("../config.json")
const { runScript, logBalance } = require("./utils")

const swapAddress = '0x70e0bA845a1A0F2DA3359C97E0285013525FFC49'
const holderAddress = '0x67e9a5894D2713553cd3cBC7D034Be9F1F830D3b'

const amount = '1000000'

runScript(async function () {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [holderAddress]
    })
    console.log(`Impersonated ${holderAddress}`)
    const signer = await ethers.provider.getSigner(holderAddress)
    
    const Swap = await ethers.getContractFactory('Swap')
    const swap = await Swap.attach(swapAddress)
    
    await logBalance(holderAddress, config.weth, config.dai)

    const dai = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', config.dai)
    console.log(`Approving ${amount} DAI to Swap contract...`)
    await (await dai.connect(signer).approve(swap.address, ethers.utils.parseUnits(amount))).wait()

    console.log(`Swapping ${amount} DAI for WETH...`)
    const allowance = await dai.connect(signer).allowance(holderAddress, swap.address)
    await (await swap.connect(signer).swapToken0(ethers.utils.parseUnits(amount))).wait()
    console.log(`Swap succeeded!`)

    await logBalance(holderAddress, config.weth, config.dai)
})