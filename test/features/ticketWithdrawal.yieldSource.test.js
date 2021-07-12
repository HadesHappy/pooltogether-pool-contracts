const { PoolEnv } = require('./support/PoolEnv')

describe('YieldSource Prize Pool /w Compound yield source withdrawals', () => {

  let env

  beforeEach(() => {
    env = new PoolEnv()
  })

  describe('instantly', () => {
    it('should should charge the exit fee when the user has no credit', async () => {
      await env.createPool({ poolType: 'yieldSource', prizePeriodSeconds: 10, creditLimit: '0.1', creditRate: '0.01' })
      await env.setCurrentTime(5)
      await env.buyTickets({ user: 1, tickets: 100 })
      await env.withdrawInstantly({ user: 1, tickets: 100 })
      await env.expectUserToHaveTokens({ user: 1, tokens: 90 })
      await env.expectUserToHaveCredit({ user: 1, credit: 0 })
    })

    it('should allow a winner to withdraw instantly', async () => {
      await env.createPool({ poolType: 'yieldSource', prizePeriodSeconds: 10, creditLimit: '0.1', creditRate: '0.01' })
      await env.buyTickets({ user: 1, tickets: 100 })
      await env.poolAccrues({ tickets: 10 }) // 10% collateralized
      await env.awardPrize()
      await env.expectUserToHaveCredit({ user: 1, credit: 11 })
      await env.expectUserToHaveTickets({ user: 1, tickets: 110 })
      await env.withdrawInstantly({ user: 1, tickets: 110 })
      await env.expectUserToHaveTokens({ user: 1, tokens: 110 })
      // all of their credit was burned
      await env.expectUserToHaveCredit({ user: 1, credit: 0 })
    })

    it('should require the fees be paid before credit is consumed', async () => {
      await env.createPool({ poolType: 'yieldSource', prizePeriodSeconds: 10, creditLimit: '0.1', creditRate: '0.01' })
      await env.buyTickets({ user: 1, tickets: 100 })
      await env.setCurrentTime(10)
      await env.buyTickets({ user: 1, tickets: 100 })
      await env.awardPrize()
      await env.withdrawInstantly({ user: 1, tickets: 100 })
      // charge was taken from user
      await env.expectUserToHaveTokens({ user: 1, tokens: 90 })
      // user still has credit from first deposit
      await env.expectUserToHaveCredit({ user: 1, credit: 10 })
    })

    describe('with very large amounts', () => {
      let largeAmount = '999999999999999999' // 999 quadrillion

      it('should calculate correct exit-fees at 10%', async () => {
        await env.createPool({ poolType: 'yieldSource', prizePeriodSeconds: 10, creditLimit: '0.1', creditRate: '0.01' })
        await env.buyTickets({ user: 1, tickets: largeAmount })
        await env.poolAccrues({ tickets: '99999999999999999.9' }) // 10% collateralized
        await env.awardPrize()
        await env.withdrawInstantly({ user: 1, tickets: '1099999999999999998.9' })
        await env.expectUserToHaveTokens({ user: 1, tokens: '1099999999999999998.9' })
        // all of their credit was burned
        await env.expectUserToHaveCredit({ user: 1, credit: 0 })
      })

      it('should calculate correct exit-fees at 25%', async () => {
        await env.createPool({ poolType: 'yieldSource', prizePeriodSeconds: 10, creditLimit: '0.25', creditRate: '0.025' })
        await env.buyTickets({ user: 1, tickets: largeAmount })
        await env.poolAccrues({ tickets: '249999999999999999.75' }) // 25% collateralized
        await env.awardPrize()
        await env.withdrawInstantly({ user: 1, tickets: '1249999999999999998.75' })
        await env.expectUserToHaveTokens({ user: 1, tokens: '1249999999999999998.75' })
        // all of their credit was burned
        await env.expectUserToHaveCredit({ user: 1, credit: 0 })
      })

      it('should calculate correct exit-fees at 37%', async () => {
        await env.createPool({ poolType: 'yieldSource', prizePeriodSeconds: 10, creditLimit: '0.37', creditRate: '0.037' })
        await env.buyTickets({ user: 1, tickets: largeAmount })
        await env.poolAccrues({ tickets: '369999999999999999.63' }) // 37% collateralized
        await env.awardPrize()
        await env.withdrawInstantly({ user: 1, tickets: '1369999999999999998.63' })
        await env.expectUserToHaveTokens({ user: 1, tokens: '1369999999999999998.63' })
        // all of their credit was burned
        await env.expectUserToHaveCredit({ user: 1, credit: 0 })
      })

      it('should calculate correct exit-fees at 99%', async () => {
        await env.createPool({ poolType: 'yieldSource', prizePeriodSeconds: 10, creditLimit: '0.99', creditRate: '0.099' })
        await env.buyTickets({ user: 1, tickets: largeAmount })
        await env.poolAccrues({ tickets: '989999999999999999.01' }) // 99% collateralized
        await env.awardPrize()
        await env.withdrawInstantly({ user: 1, tickets: '1989999999999999998.01' })
        await env.expectUserToHaveTokens({ user: 1, tokens: '1989999999999999998.01' })
        // all of their credit was burned
        await env.expectUserToHaveCredit({ user: 1, credit: 0 })
      })
    })
  })
})
