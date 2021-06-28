
const uniFactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
const sushiFactoryAddress = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'
const uniRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const sushiRouterAddress = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'

const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
// const wbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f'

async function main() {
  // const senderAddress = (await ethers.provider.getSigner()).getAddress()
  
  const Swap = await ethers.getContractFactory('Swap')
  console.log('Deploying Swap...')
  const swap = await Swap.deploy(uniRouterAddress, daiAddress, wethAddress)
  await swap.deployed()
  console.log('Swap deployed to:', swap.address)

  const FlashSwap = await ethers.getContractFactory('FlashSwap')
  console.log('Deploying FlashSwap...')
  const flashswap = await FlashSwap.deploy(uniFactoryAddress, sushiFactoryAddress, sushiRouterAddress)
  await flashswap.deployed()
  console.log('FlashSwap deployed to:', flashswap.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });