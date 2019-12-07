const { fetchUsers } = require('./fetchUsers')
const chai = require('chai')
const { exec } = require('./exec')
const chalk = require('chalk')
const {
  BINANCE_ADDRESS
} = require('./constants')

async function pay (context) {
  console.log(chalk.yellow('Starting ethers payments to admin and users...'))

  const {
    provider,
    ethers
  } = context

  const users = await fetchUsers(5)

  // Binance 7 account.  Has *tons* of Ether
  let binance = provider.getSigner(BINANCE_ADDRESS)

  // Transfer eth to the admin so that we can deploy contracts
  await exec(provider, binance.sendTransaction({ to: process.env.ADMIN_ADDRESS, value: ethers.utils.parseEther('100') }))
  console.log(chalk.dim(`ProxyAdmin ${process.env.ADMIN_ADDRESS} received 100 ether`))

  for (let i = 0; i < users.length; i++) {
    const user = users[i].id
    await exec(provider, binance.sendTransaction({ to: user, value: ethers.utils.parseEther('100') }))
    console.log(chalk.dim(`${user} received 100 ether`))
  }

  console.log(chalk.green('Complete payments.'))
}

module.exports = {
  pay
}
