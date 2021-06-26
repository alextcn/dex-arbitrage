
const wbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'
const swapAddress = '0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf'

const senderAddress = '0x67e9a5894D2713553cd3cBC7D034Be9F1F830D3b'
const amount = '30000'

async function main() {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [senderAddress]
    })
    console.log(`impersonated ${senderAddress}`)
    const signer = await ethers.provider.getSigner(senderAddress)
    
    const Swap = await ethers.getContractFactory('Swap')
    const swap = await Swap.attach(swapAddress)

    const wbtc = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', wbtcAddress)
    const dai = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', daiAddress)
    
    await printBalances(wbtc, dai, signer)

    console.log(`approving ${amount} DAI to Swap contract...`)
    await (await dai.connect(signer).approve(swap.address, ethers.utils.parseUnits(amount))).wait()

    const allowance = await dai.connect(signer).allowance(senderAddress, swap.address)
    console.log(`[sender -> Swap contract] DAI allowance is ${ethers.utils.formatUnits(allowance)}`)

    console.log(`swapping ${amount} DAI for WBTC...`)
    await (await swap.connect(signer).swapToken0(ethers.utils.parseUnits(amount))).wait()
    console.log(`swap succeeded!`)

    await printBalances(wbtc, dai, signer)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })

async function printBalances(wbtc, dai, signer) {
    const address = await signer.getAddress()
    var wbtcBalance = await wbtc.connect(signer).balanceOf(address)
    var daiBalance = await dai.connect(signer).balanceOf(address)
    console.log(`[${address}] balance:`)
    console.log(`${ethers.utils.formatUnits(wbtcBalance, 8)} WBTC`)
    console.log(`${ethers.utils.formatUnits(daiBalance, 18)} DAI`)
}