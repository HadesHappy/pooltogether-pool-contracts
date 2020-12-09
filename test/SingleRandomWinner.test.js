const { deployContract } = require('ethereum-waffle')
const { deployMockContract } = require('./helpers/deployMockContract')
const { call } = require('./helpers/call')
const { deploy1820 } = require('deploy-eip-1820')
const TokenListenerInterface = require('../build/TokenListenerInterface.json')
const SingleRandomWinnerHarness = require('../build/SingleRandomWinnerHarness.json')
const PrizePool = require('../build/PrizePool.json')
const RNGInterface = require('../build/RNGInterface.json')
const IERC20 = require('../build/IERC20Upgradeable.json')
const IERC721 = require('../build/IERC721Upgradeable.json')
const ControlledToken = require('../build/ControlledToken.json')
const Ticket = require('../build/Ticket.json')

const { expect } = require('chai')
const buidler = require('@nomiclabs/buidler')

const now = () => (new Date()).getTime() / 1000 | 0
const toWei = (val) => ethers.utils.parseEther('' + val)
const debug = require('debug')('ptv3:PeriodicPrizePool.test')

let overrides = { gasLimit: 20000000 }

describe('SingleRandomWinner', function() {
  let wallet, wallet2

  let externalERC20Award, externalERC721Award

  let registry, comptroller, prizePool, prizeStrategy, token

  let ticket, sponsorship, rng, rngFeeToken

  let prizePeriodStart = now()
  let prizePeriodSeconds = 1000

  let creditLimitMantissa = 0.1

  beforeEach(async () => {
    [wallet, wallet2, wallet3] = await buidler.ethers.getSigners()

    debug(`using wallet ${wallet._address}`)

    debug('deploying registry...')
    registry = await deploy1820(wallet)

    debug('deploying protocol comptroller...')
    comptroller = await deployMockContract(wallet, TokenListenerInterface.abi, [], overrides)

    debug('mocking tokens...')
    token = await deployMockContract(wallet, IERC20.abi, overrides)
    prizePool = await deployMockContract(wallet, PrizePool.abi, overrides)
    ticket = await deployMockContract(wallet, Ticket.abi, overrides)
    sponsorship = await deployMockContract(wallet, ControlledToken.abi, overrides)
    rng = await deployMockContract(wallet, RNGInterface.abi, overrides)
    rngFeeToken = await deployMockContract(wallet, IERC20.abi, overrides)
    externalERC20Award = await deployMockContract(wallet, IERC20.abi, overrides)
    externalERC721Award = await deployMockContract(wallet, IERC721.abi, overrides)

    await rng.mock.getRequestFee.returns(rngFeeToken.address, toWei('1'));

    debug('deploying prizeStrategy...')
    prizeStrategy = await deployContract(wallet, SingleRandomWinnerHarness, [], overrides)

    await prizePool.mock.canAwardExternal.withArgs(externalERC20Award.address).returns(true)
    await prizePool.mock.canAwardExternal.withArgs(externalERC721Award.address).returns(true)

    // wallet 1 always wins
    await ticket.mock.draw.returns(wallet._address)

    debug('initializing prizeStrategy...')
    await prizeStrategy.initialize(
      prizePeriodStart,
      prizePeriodSeconds,
      prizePool.address,
      ticket.address,
      sponsorship.address,
      rng.address,
      []
    )

    debug('initialized!')
  })

  describe('distribute()', () => {
    it('should ignore awarding prizes if there are no winners to select', async () => {
      await prizePool.mock.captureAwardBalance.returns(toWei('10'))
      await ticket.mock.draw.withArgs(10).returns(ethers.constants.AddressZero)
      await expect(prizeStrategy.distribute(10))
        .to.emit(prizeStrategy, 'NoWinner')
    })

    it('should award a single winner', async () => {
      let randomNumber = 10
      await prizePool.mock.captureAwardBalance.returns(toWei('8'))
      await ticket.mock.draw.withArgs(randomNumber).returns(wallet3._address)

      await externalERC20Award.mock.balanceOf.withArgs(prizePool.address).returns(0)

      await ticket.mock.totalSupply.returns(1000)

      await prizePool.mock.award.withArgs(wallet3._address, toWei('8'), ticket.address).returns()

      await prizeStrategy.distribute(randomNumber)
    })
  })
})
