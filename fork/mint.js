const { fetchUsers } = require('./fetchUsers')
const chalk = require('chalk')
const { exec } = require('./exec')
const {
  DAI,
  SAI,
  SAI_BUDDY,
  DAI_BUDDY
} = require('./constants')

async function mint(context, type) {
  console.log(chalk.yellow(`Starting ${type} mint...`))
  const {
    provider,
    ethers,
    interfaces
  } = context

  let token

  switch (type) {
    case 'dai':
      token = new ethers.Contract(DAI, interfaces.ERC20.abi, provider.getSigner(DAI_BUDDY))
      break
    default:
      token = new ethers.Contract(SAI, interfaces.ERC20.abi, provider.getSigner(SAI_BUDDY))
  }

  const users = await fetchUsers(5)

  for (let i = 0; i < users.length; i++) {
    const user = users[i].id
    await exec(provider, token.transfer(user, ethers.utils.parseEther('100')))
    console.log(chalk.dim(`Transferred 100 ${type} to ${user}`))
  }

  console.log(chalk.green(`Done ${type} mint.`))
}

module.exports = {
  mint
}