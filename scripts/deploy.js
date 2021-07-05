
const runScript = require("./utils").runScript
const cfg = require('../config.json')

runScript(async function () {
  const FlashSwap = await ethers.getContractFactory('FlashSwap')
  console.log('Deploying FlashSwap...')
  const flashswap = await FlashSwap.deploy(cfg.uniFactory, cfg.sushiRouter)
  await flashswap.deployed()
  console.log('FlashSwap deployed to:', flashswap.address)

  const FlashLoanSwap = await ethers.getContractFactory('FlashLoanSwap')
  console.log('Deploying FlashLoanSwap...')
  const flashLoanSwap = await FlashLoanSwap.deploy(cfg.aaveProvider, cfg.uniRouter, cfg.sushiRouter)
  await flashLoanSwap.deployed()
  console.log('FlashLoanSwap deployed to:', flashLoanSwap.address)
})