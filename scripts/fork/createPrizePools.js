const hardhat = require('hardhat')
const chalk = require("chalk")
const { increaseTime } = require('../../test/helpers/increaseTime')

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments))
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments))
}

const { ethers, deployments, getNamedAccounts } = hardhat

async function getStakePrizePoolProxy(tx) { 
  const stakePrizePoolProxyFactory = await ethers.getContract('StakePrizePoolProxyFactory')
  const createResultReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
  const createResultEvents = createResultReceipt.logs.map(log => { try { return stakePrizePoolProxyFactory.interface.parseLog(log) } catch (e) { return null } })
  return createResultEvents[0].args.proxy
}

async function run() {
  const operationsSafe = await ethers.provider.getUncheckedSigner('0x029Aa20Dcc15c022b1b61D420aaCf7f179A9C73f')
  const dai = await ethers.getContractAt('Dai', '0x6b175474e89094c44da98b954eedeac495271d0f', operationsSafe)
  const usdc = await ethers.getContractAt('Dai', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', operationsSafe)
  const builder = await ethers.getContract('PoolWithMultipleWinnersBuilder', operationsSafe)

  let block = await ethers.provider.getBlock()

  const stakePrizePoolConfig = {
    token: dai.address,
    maxExitFeeMantissa: ethers.utils.parseEther('0.1'),
    maxTimelockDuration: 365 * 24 * 3600
  }

  const multipleWinnersConfig = {
    rngService: "0xb1D89477d1b505C261bab6e73f08fA834544CD21",
    prizePeriodStart: block.timestamp,
    prizePeriodSeconds: 1,
    ticketName: "TICKET",
    ticketSymbol: "TICK",
    sponsorshipName: "SPONSORSHIP",
    sponsorshipSymbol: "SPON",
    ticketCreditLimitMantissa: '0',
    ticketCreditRateMantissa: '0',
    numberOfWinners: 1,
    splitExternalErc20Awards: false
  }

  const tx = await builder.createStakeMultipleWinners(
    stakePrizePoolConfig,
    multipleWinnersConfig,
    18
  )

  const prizePool = await ethers.getContractAt('StakePrizePool', await getStakePrizePoolProxy(tx), operationsSafe)

  green(`Created StakePrizePool ${prizePool.address}`)

  const prizeStrategy = await ethers.getContractAt('MultipleWinners', await prizePool.prizeStrategy(), operationsSafe)
  await prizeStrategy.addExternalErc20Award('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')

  const sablier = await ethers.getContractAt('ISablier', '0xA4fc358455Febe425536fd1878bE67FfDBDEC59a', operationsSafe)

  const daiStreamAmount = ethers.utils.parseEther('10')
  const usdcStreamAmount = ethers.utils.parseUnits('10', 8)

  await dai.approve(prizePool.address, daiStreamAmount)
  dim(`Depositing ${ethers.utils.formatEther(daiStreamAmount)} Dai...`)
  await prizePool.depositTo(operationsSafe._address, daiStreamAmount, await prizeStrategy.ticket(), ethers.constants.AddressZero)
  green(`Deposited`)

  await dai.approve(sablier.address, daiStreamAmount)
  await usdc.approve(sablier.address, usdcStreamAmount)

  dim(`Creating Sablier Dai stream...`)
  block = await ethers.provider.getBlock()
  let startTime = block.timestamp + 100
  const daiStreamTx = await sablier.createStream(prizeStrategy.address, daiStreamAmount, dai.address, startTime, startTime + 100)
  const daiStreamReceipt = await ethers.provider.getTransactionReceipt(daiStreamTx.hash)
  const daiStreamEvents = daiStreamReceipt.logs.map(log => { try { return sablier.interface.parseLog(log) } catch (e) { return null } })
  const daiStreamId = daiStreamEvents[1].args.streamId

  dim(`Creating Sablier USDC stream...`)
  block = await ethers.provider.getBlock()
  startTime = block.timestamp + 100
  const usdcStreamTx = await sablier.createStream(prizeStrategy.address, usdcStreamAmount, usdc.address, startTime, startTime + 100)
  const usdcStreamReceipt = await ethers.provider.getTransactionReceipt(usdcStreamTx.hash)
  const usdcStreamEvents = usdcStreamReceipt.logs.map(log => { try { return sablier.interface.parseLog(log) } catch (e) { return null } })
  const usdcStreamId = usdcStreamEvents[1].args.streamId

  dim(`Prize strategy owner: ${await prizeStrategy.owner()}`)

  dim(`Setting sablier ${sablier.address} on prize strategy...`)
  await prizeStrategy.setSablier(sablier.address)

  dim(`Setting stream ids on prize strategy...`)
  await prizeStrategy.setSablierStreamIds([daiStreamId, usdcStreamId])

  await increaseTime(150)

  dim(`Starting award...`)
  await prizeStrategy.startAward()
  await increaseTime(1)
  dim(`Completing award...`)
  const awardTx = await prizeStrategy.completeAward()
  const awardReceipt = await ethers.provider.getTransactionReceipt(awardTx.hash)
  const awardLogs = awardReceipt.logs.map(log => { try { return prizePool.interface.parseLog(log) } catch (e) { return null }})
  const strategyLogs = awardReceipt.logs.map(log => { try { return prizeStrategy.interface.parseLog(log) } catch (e) { return null }})
  
  console.log({ awardLogs })
  console.log({ strategyLogs })

  const awarded = awardLogs.find(event => event && event.name === 'Awarded')
  const awardedExternal = awardLogs.find(event => event && event.name === 'AwardedExternalERC20')

  console.log(`Awarded ${ethers.utils.formatEther(awarded.args.amount)} Dai`)
  console.log(`Awarded ${ethers.utils.formatUnits(awardedExternal.args.amount, 8)} USDC`)

}

run()
