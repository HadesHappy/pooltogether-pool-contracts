const { PoolEnv } = require('./support/PoolEnv')
const ethers = require('ethers')

const toWei = (val) => ethers.utils.parseEther('' + val)

describe('Referral volume drip', () => {

  let env

  beforeEach(() => {
    env = new PoolEnv()
  })

  it('should drip users governance tokens', async () => {
    await env.createPool({ prizePeriodSeconds: 10, exitFee: '0.1', creditRate: '0.01' })
    await env.referralVolumeDripGovernanceToken({ dripAmount: '100', periodSeconds: 10, startTime: 20 })
    await env.buyTicketsAtTime({ user: 1, tickets: '10', elapsed: 30, referrer: 2 })
    await env.claimReferralVolumeDripGovernanceTokensAtTime({ user: 2, elapsed: 40 })
    await env.expectUserToHaveGovernanceTokens({ user: 2, tokens: '100' })
  })
})