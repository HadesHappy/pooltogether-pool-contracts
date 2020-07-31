const { expect } = require('chai')
const CounterfactualActionFactory = require('../build/CounterfactualActionFactory.json')
const PrizePool = require('../build/PrizePool.json')
const IERC20 = require('../build/IERC20.json')
const { ethers } = require('./helpers/ethers')
const buidler = require('./helpers/buidler')
const { deployContract, deployMockContract } = require('ethereum-waffle')

const toWei = ethers.utils.parseEther

const TICKET_ADDRESS = '0xea674fdde714fd979de3edf0f56aa9716b898ec8'

describe('CounterfactualActionFactory', () => {

  let wallet, wallet2

  let token, prizePool

  let provider

  beforeEach(async () => {
    [wallet, wallet2] = await buidler.ethers.getSigners()
    provider = buidler.ethers.provider

    token = await deployMockContract(wallet, IERC20.abi)
    prizePool = await deployMockContract(wallet, PrizePool.abi)
    await prizePool.mock.token.returns(token.address)

    factory = await deployContract(wallet, CounterfactualActionFactory, [])
    await factory.initialize(prizePool.address)
  })

  describe('depositTo', () => {
    it('should allow depositTo from anyone', async () => {
      let address = await factory.calculateAddress(wallet._address)
      let depositAmount = toWei('100')

      await token.mock.balanceOf.withArgs(address).returns(depositAmount)
      await token.mock.approve.withArgs(prizePool.address, depositAmount).returns(true)
      await prizePool.mock.depositTo.withArgs(wallet._address, depositAmount, TICKET_ADDRESS, []).returns()

      await factory.depositTo(wallet._address, TICKET_ADDRESS, [])
    })
  })

  describe('cancel', () => {
    it('should someone to withdraw their funds', async () => {
      let address = await factory.calculateAddress(wallet._address)
      let depositAmount = toWei('100')

      await token.mock.balanceOf.withArgs(address).returns(depositAmount)
      await token.mock.transfer.withArgs(wallet._address, depositAmount).returns(true)

      await factory.cancel(wallet._address)
    })
  })

  describe('code()', () => {
    it("should show the same code", async () => {
      let code = await factory.code()

      expect(code.length).to.equal(112)
    })
  })

})
