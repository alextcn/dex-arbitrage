
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'
const fromAddress = '0x67e9a5894D2713553cd3cBC7D034Be9F1F830D3b' // random DAI holder

async function main() {
    const toAddress = await (await ethers.provider.getSigner()).getAddress()
    const amount = '50000'

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [fromAddress]
    })
    const fromSigner = await ethers.provider.getSigner(fromAddress)
    console.log(`impersonated ${fromAddress}`)

    const dai = await ethers.getContractAt(
        '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20',
        daiAddress
    )
    console.log(`sending ${amount} DAI from ${fromAddress} to ${toAddress}...`)

    const tx = await dai.connect(fromSigner).transfer(toAddress, ethers.utils.parseUnits(amount))
    await tx.wait()
    console.log(`${amount} DAI has been sent to ${toAddress}!`)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })