
const uniRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'

async function main() {
  const senderAddress = (await ethers.provider.getSigner()).getAddress()
  
  const Swap = await ethers.getContractFactory('Swap')
  console.log('Deploying Swap...')
  const swap = await Swap.deploy(daiAddress, uniRouterAddress)

  await swap.deployed()
  console.log('Swap deployed to:', swap.address)


  const dai = await ethers.getContractAt(
    '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20',
    daiAddress
  )

  const balance = await dai.balanceOf(senderAddress)
  console.log(`sender DAI balance is ${ethers.utils.formatUnits(balance, '18')}`)

  await dai.approve(swap.address, balance)
  const allowance = await dai.allowance(senderAddress, swap.address)
  console.log(`[sender -> contract] DAI allowance is ${allowance}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });