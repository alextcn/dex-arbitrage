
const uniRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const wbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'

const daiHolderAddress = '0x67e9a5894D2713553cd3cBC7D034Be9F1F830D3b' // random DAI holder
const daiToSpend = '100000'


// todo:
// [ ] - update swap contract to swap 2 random coins
// [ ] - use it to swap here

// pump WBTC/DAI price on Uniswap (buy a lot of WBTC from DAI holder)
async function main() {
    const router = await ethers.getContractAt(
        '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol:IUniswapV2Router02',
        uniRouterAddress
    )
    // TODO: print WBTC and DAI balance of `daiHolderAddress`

    const daiHolderSigner = await getImpersonatedSigner(daiHolderAddress)
    
    console.log(`swapping ${daiToSpend} DAI for WBTC...`)
    const tx = await router.connect(daiHolderSigner).swapExactTokensForTokens(
        ethers.utils.parseUnits(daiToSpend), 
        '0', 
        [daiAddress, wbtcAddress], 
        daiHolderAddress, 
        '1624990116'
    )
    await tx.wait()
    console.log('swapped!')

    // TODO: print WBTC and DAI balance of `daiHolderAddress`
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })

async function getImpersonatedSigner(address) {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address]
    })
    const signer = await ethers.provider.getSigner(address)
    console.log(`impersonated ${address}`)
    return signer
}