const { expect } = require("chai");
const ComptrollerHarness = require('../build/ComptrollerHarness.json')
const IERC20 = require('../build/IERC20.json')
const buidler = require('./helpers/buidler')
const { deployContract } = require('ethereum-waffle')
const { deployMockContract } = require('./helpers/deployMockContract');
const { AddressZero } = require("ethers/constants");

const toWei = ethers.utils.parseEther

const overrides = { gasLimit: 20000000 }

const SENTINAL = '0x0000000000000000000000000000000000000001'

describe('Comptroller', () => {

  let wallet, wallet2

  let provider
  let comptroller, comptroller2, dripToken, measure

  beforeEach(async () => {
    [wallet, wallet2] = await buidler.ethers.getSigners()
    provider = buidler.ethers.provider

    measure = await deployMockContract(wallet, IERC20.abi)
    dripToken = await deployMockContract(wallet, IERC20.abi)
    comptroller = await deployContract(wallet, ComptrollerHarness, [], overrides)
    comptroller2 = comptroller.connect(wallet2)
    await comptroller.initialize()
  })

  describe('initialize()', () => {
    it("should set the owner wallet", async () => {
      expect(await comptroller.owner()).to.equal(wallet._address)
    })
  })

  describe('setReserveRateMantissa()', () => {
    it('should allow the owner to set the reserve', async () => {
      await expect(comptroller.setReserveRateMantissa(toWei('0.1')))
        .to.emit(comptroller, 'ReserveRateMantissaSet')
        .withArgs(toWei('0.1'))

      expect(await comptroller.reserveRateMantissa()).to.equal(toWei('0.1'))
    })

    it('should not allow anyone else to configure the reserve rate', async () => {
      await expect(comptroller2.setReserveRateMantissa(toWei('0.2'))).to.be.revertedWith("Ownable: caller is not the owner")
    })
  })

  describe('addBalanceDrip()', () => {
    it('should add a balance drip', async () => {
      await expect(comptroller.addBalanceDrip(wallet._address, measure.address, dripToken.address, toWei('0.001')))
        .to.emit(comptroller, 'BalanceDripAdded')
        .withArgs(wallet._address, measure.address, dripToken.address, toWei('0.001'))

      let drip = await comptroller.getBalanceDrip(wallet._address, measure.address, dripToken.address)
      expect(drip.dripRatePerSecond).to.equal(toWei('0.001'))
    })

    it('should allow only the owner to add drips', async () => {
      await expect(comptroller2.addBalanceDrip(wallet._address, measure.address, dripToken.address, toWei('0.001'))).to.be.revertedWith("Ownable: caller is not the owner")
    })
  })

  describe('removeBalanceDrip()', () => {
    beforeEach(async () => {
      await comptroller.addBalanceDrip(wallet._address, measure.address, dripToken.address, toWei('0.001'))
    })

    it('should remove a balance drip', async () => {
      await expect(comptroller.removeBalanceDrip(wallet._address, measure.address, SENTINAL, dripToken.address))
        .to.emit(comptroller, 'BalanceDripRemoved')
        .withArgs(wallet._address, measure.address, dripToken.address)

      let drip = await comptroller.getBalanceDrip(wallet._address, measure.address, dripToken.address)
      expect(drip.dripRatePerSecond).to.equal('0')
    })

    it('should allow only the owner to remove drips', async () => {
      await expect(comptroller2.removeBalanceDrip(wallet._address, measure.address, SENTINAL, dripToken.address)).to.be.revertedWith("Ownable: caller is not the owner")
    })
  })

  describe('setBalanceDripRate()', () => {
    beforeEach(async () => {
      await comptroller.addBalanceDrip(wallet._address, measure.address, dripToken.address, toWei('0.001'))
    })

    it('should allow the owner to update the drip rate', async () => {
      await expect(comptroller.setBalanceDripRate(wallet._address, measure.address, dripToken.address, toWei('0.1')))
        .to.emit(comptroller, 'BalanceDripRateSet')
        .withArgs(wallet._address, measure.address, dripToken.address, toWei('0.1'))

      let drip = await comptroller.getBalanceDrip(wallet._address, measure.address, dripToken.address)
      expect(drip.dripRatePerSecond).to.equal(toWei('0.1'))
    })

    it('should not allow anyone else to update the drip rate', async () => {
      await expect(comptroller2.setBalanceDripRate(wallet._address, measure.address, dripToken.address, toWei('0.1'))).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('afterDepositTo()', () => {
    it('should update the balance drips', async () => {
      await comptroller.setCurrentTime(1)
      await comptroller.addBalanceDrip(wallet._address, measure.address, dripToken.address, toWei('0.001'))
      await comptroller.afterDepositTo(wallet._address, toWei('10'), toWei('10'), toWei('10'), measure.address, AddressZero)
      await comptroller.setCurrentTime(11)
      // should have accrued 10 blocks worth of the drip: 10 * 0.001 = 0.01

      await dripToken.mock.transfer.withArgs(wallet._address, toWei('0.01')).returns(true)
      await measure.mock.balanceOf.withArgs(wallet._address).returns(toWei('10'))
      await measure.mock.totalSupply.returns(toWei('10'))

      await expect(comptroller.claimBalanceDrip(wallet._address, wallet._address, measure.address, dripToken.address))
        .to.emit(comptroller, 'BalanceDripClaimed')
        .withArgs(wallet._address, wallet._address, measure.address, dripToken.address, toWei('0.01'))
    })
  })

  describe('afterWithdrawFrom()', () => {
    it('should update the balance drips', async () => {
      await comptroller.setCurrentTime(1)
      await comptroller.addBalanceDrip(wallet._address, measure.address, dripToken.address, toWei('0.001'))
      await comptroller.afterDepositTo(wallet._address, toWei('10'), toWei('10'), toWei('10'), measure.address, AddressZero)
      await comptroller.setCurrentTime(11)
      await comptroller.afterWithdrawFrom(wallet._address, toWei('10'), toWei('0'), toWei('0'), measure.address)

      // user should have accrued 0.01 tokens, now they should be accruing none.

      // move forward another 10 seconds
      await comptroller.setCurrentTime(21)

      // now we claim, and it should not add any more tokens
      await dripToken.mock.transfer.withArgs(wallet._address, toWei('0.01')).returns(true)
      await measure.mock.balanceOf.withArgs(wallet._address).returns(toWei('0'))
      await measure.mock.totalSupply.returns(toWei('0'))
      await expect(comptroller.claimBalanceDrip(wallet._address, wallet._address, measure.address, dripToken.address))
        .to.emit(comptroller, 'BalanceDripClaimed')
        .withArgs(wallet._address, wallet._address, measure.address, dripToken.address, toWei('0.01'))
    })
  })
})
