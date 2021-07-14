
import { ethers } from "hardhat"
import { runScript } from "./utils"
import cfg from '../config.json'

runScript(async function () {
  const FlashSwap = await ethers.getContractFactory('FlashSwap')
  console.log('Deploying FlashSwap...')
  const flashswap = await FlashSwap.deploy(cfg.uni.factory)
  await flashswap.deployed()
  console.log('FlashSwap deployed to:', flashswap.address)

  const FlashLoanSwap = await ethers.getContractFactory('FlashLoanSwap')
  console.log('Deploying FlashLoanSwap...')
  const flashLoanSwap = await FlashLoanSwap.deploy(cfg.aaveProvider, cfg.uni.router, cfg.sushi.router)
  await flashLoanSwap.deployed()
  console.log('FlashLoanSwap deployed to:', flashLoanSwap.address)
})