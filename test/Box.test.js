const { expect } = require("chai")
const { BigNumber } = require("ethers")

describe("Box", function() {
  const value = BigNumber.from(42)

  before(async function () {
    [this.owner, this.other] = await ethers.getSigners()
    this.Box = await ethers.getContractFactory('Box')
  })

  beforeEach(async function () {
      this.box = await this.Box.deploy()
      await this.box.deployed()
  })

  it('retrieve returns a value previously stored', async function () {
      await this.box.store(value)
      expect(await this.box.retrieve()).to.equal(value)
  })

  it('store emits an event', async function () {
      await expect(this.box.store(value)).to.emit(this.box, 'ValueChanged').withArgs(value)
  })

  it('non owner cannot store a value', async function () {
      await expect(this.box.connect(this.other).store(value)).to.be.reverted
  })
})