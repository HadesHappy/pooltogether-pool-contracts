const RNGServiceMock = require('../build/RNGServiceMock.json')
const Forwarder = require('../build/Forwarder.json')
const MockComptroller = require('../build/MockComptroller.json')
const CompoundPrizePoolBuilder = require('../build/CompoundPrizePoolBuilder.json')
const CompoundPrizePoolProxyFactory = require('../build/CompoundPrizePoolProxyFactory.json')
const ControlledTokenProxyFactory = require('../build/ControlledTokenProxyFactory.json')
const PrizeStrategyProxyFactory = require('../build/PrizeStrategyProxyFactory.json')
const CTokenMock = require('../build/CTokenMock.json')
const ERC20Mintable = require('../build/ERC20Mintable.json')

const ethers = require('ethers')
const { deploy1820 } = require('deploy-eip-1820')
const { deployContract } = require('ethereum-waffle')

const debug = require('debug')('ptv3:deployContracts')

async function deployContracts(wallet, overrides = { gasLimit: 20000000 }) {
  let registry = await deploy1820(wallet)

  debug('beforeEach deploy rng, forwarder etc...')

  let rng = await deployContract(wallet, RNGServiceMock, [], overrides)
  let forwarder = await deployContract(wallet, Forwarder, [], overrides)
  let token = await deployContract(wallet, ERC20Mintable, [], overrides)
  let cToken = await deployContract(wallet, CTokenMock, [
    token.address, ethers.utils.parseEther('0.01')
  ], overrides)

  debug('deploying protocol comptroller...')

  let comptroller = await deployContract(wallet, MockComptroller, [], overrides)

  debug('deploying controlled token factory')

  let controlledTokenProxyFactory = await deployContract(wallet, ControlledTokenProxyFactory, [], overrides)
  await controlledTokenProxyFactory.initialize(overrides)

  debug('deploying compound prize pool proxy factory')

  let compoundPrizePoolProxyFactory = await deployContract(wallet, CompoundPrizePoolProxyFactory, [], overrides)
  await compoundPrizePoolProxyFactory.initialize(overrides)

  debug('deploying prize strategy proxy factory')

  let prizeStrategyProxyFactory = await deployContract(wallet, PrizeStrategyProxyFactory, [], overrides)
  await prizeStrategyProxyFactory.initialize(overrides)
  
  debug('deploying prize strategy builder')

  let compoundPrizePoolBuilder = await deployContract(wallet, CompoundPrizePoolBuilder, [], overrides)
  await compoundPrizePoolBuilder.initialize(
    comptroller.address,
    prizeStrategyProxyFactory.address,
    forwarder.address,
    compoundPrizePoolProxyFactory.address,
    controlledTokenProxyFactory.address,
    rng.address,
    overrides
  )

  debug('deployContracts complete!')

  return {
    rng,
    registry,
    forwarder,
    token,
    cToken,
    comptroller,
    prizeStrategyProxyFactory,
    controlledTokenProxyFactory,
    compoundPrizePoolProxyFactory,
    compoundPrizePoolBuilder
  }
}

module.exports = {
  deployContracts
}