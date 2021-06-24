
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'
const swapAddress = '0x70e0bA845a1A0F2DA3359C97E0285013525FFC49'

async function main() {
    const senderAddress = await (await ethers.provider.getSigner()).getAddress()
    const amount = '2000'

    const dai = await ethers.getContractAt(
        '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20',
        daiAddress
    )
    const Swap = await ethers.getContractFactory('Swap')
    const swap = await Swap.attach(swapAddress)

    var ethBalance = await ethers.provider.getBalance(senderAddress)
    var daiBalance = await dai.balanceOf(senderAddress)
    console.log(`${senderAddress} balance before swap:`)
    console.log(`${ethers.utils.formatEther(ethBalance)} ETH`)
    console.log(`${ethers.utils.formatUnits(daiBalance)} DAI`)

    console.log(`swapping ${amount} DAI for ETH...`)
    await (await swap.swapDAI(ethers.utils.parseUnits(amount))).wait()
    console.log(`swap succeeded!`)

    ethBalance = await ethers.provider.getBalance(senderAddress)
    daiBalance = await dai.balanceOf(senderAddress)
    console.log(`${senderAddress} balance after swap:`)
    console.log(`${ethers.utils.formatEther(ethBalance)} ETH`)
    console.log(`${ethers.utils.formatUnits(daiBalance)} DAI`)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })