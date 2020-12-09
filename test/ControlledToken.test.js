const { expect } = require("chai");
const ControlledToken = require('../build/ControlledToken.json')
const TokenControllerInterface = require('../build/TokenControllerInterface.json')
const buidler = require('@nomiclabs/buidler')
const { deployContract } = require('ethereum-waffle')
const { deployMockContract } = require('./helpers/deployMockContract')

const toWei = ethers.utils.parseEther

describe('ControlledToken', () => {

  let wallet, wallet2

  let provider
  let controller
  let token, token2

  beforeEach(async () => {
    [wallet, wallet2] = await buidler.ethers.getSigners()
    provider = buidler.ethers.provider

    controller = await deployMockContract(wallet, TokenControllerInterface.abi)
    token = await deployContract(wallet, ControlledToken, [])
    token2 = token.connect(wallet2)
    await token.initialize(
      "Name",
      "Symbol",
      18,
      controller.address
    )
  })

  describe('controllerMint()', () => {
    it('should allow the controller to mint tokens', async () => {
      // allow all transfers
      await controller.mock.beforeTokenTransfer.returns()

      await controller.call(token, 'controllerMint', wallet._address, toWei('10'))

      expect(await token.balanceOf(wallet._address)).to.equal(toWei('10'))
    })
  })

  describe('controllerBurn()', () => {
    it('should allow the controller to burn tokens', async () => {
      // allow all transfers
      await controller.mock.beforeTokenTransfer.returns()

      await controller.call(token, 'controllerMint', wallet._address, toWei('10'))
      expect(await token.balanceOf(wallet._address)).to.equal(toWei('10'))

      await controller.call(token, 'controllerBurn', wallet._address, toWei('10'))
      expect(await token.balanceOf(wallet._address)).to.equal('0')
    })
  })

  describe('controllerBurnFrom()', () => {
    it('should allow the controller to burn for someone', async () => {
      // allow all transfers
      await controller.mock.beforeTokenTransfer.returns()

      await controller.call(token, 'controllerMint', wallet._address, toWei('10'))
      await token.approve(wallet2._address, toWei('10'))
      await controller.call(token, 'controllerBurnFrom', wallet2._address, wallet._address, toWei('10'))

      expect(await token.balanceOf(wallet._address)).to.equal('0')
      expect(await token.allowance(wallet._address, wallet2._address)).to.equal('0')
    })

    it('should not allow non-approved users to burn', async () => {
      // allow all transfers
      await controller.mock.beforeTokenTransfer.returns()

      await controller.call(token, 'controllerMint', wallet._address, toWei('10'))
      await expect(controller.call(token, 'controllerBurnFrom', wallet2._address, wallet._address, toWei('10')))
        .to.be.revertedWith('ControlledToken/exceeds-allowance')
    })

    it('should allow a user to burn their own', async () => {
      // allow all transfers
      await controller.mock.beforeTokenTransfer.returns()

      await controller.call(token, 'controllerMint', wallet._address, toWei('10'))
      await controller.call(token, 'controllerBurnFrom', wallet._address, wallet._address, toWei('10'))

      expect(await token.balanceOf(wallet._address)).to.equal('0')
    })
  })
})
