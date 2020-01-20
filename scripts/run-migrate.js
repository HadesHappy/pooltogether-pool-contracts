#!/usr/bin/env node
const { Project } = require('oz-migrate')
const shell = require('shelljs')
const chalk = require('chalk')
const { buildContext } = require('oz-console')
const commander = require('commander');
const { migrate } = require('./migrate')

function runShell(cmd) {
  console.log(chalk.dim(`$ ${cmd}`))
  const result = shell.exec(cmd)
  if (result.code !== 0) {
    throw new Error(`Could not run ${cmd}:`, result)
  }
}

const program = new commander.Command()
program.option('-n --network', 'select the network.')
program.option('-v --verbose', 'make all commands verbose', () => true)
program.option('-f --force', 'force the OpenZeppelin push command', () => true)
program.parse(process.argv)

let consoleNetwork, networkConfig, ozNetworkName

switch (program.network) {
  case 'mainnet':
    // The network that the oz-console app should talk to.  (should really just use the ozNetworkName)
    consoleNetwork = 'mainnet'

    // The OpenZeppelin SDK network name
    ozNetworkName = 'mainnet'

    // The OpenZeppelin SDK network config that oz-console should use as reference
    networkConfig = '.openzeppelin/mainnet.json'
    break
  case 'kovan':
    // The network that the oz-console app should talk to.  (should really just use the ozNetworkName)
    consoleNetwork = 'kovan'
    // The OpenZeppelin SDK network name
    ozNetworkName = 'kovan'
    // The OpenZeppelin SDK network config that oz-console should use as reference
    networkConfig = '.openzeppelin/kovan.json'
    break
  default: //rinkeby
    // The network that the oz-console app should talk to.  (should really just use the ozNetworkName)
    consoleNetwork = 'rinkeby'

    // The OpenZeppelin SDK network name
    ozNetworkName = 'rinkeby'

    // The OpenZeppelin SDK network config that oz-console should use as reference
    networkConfig = '.openzeppelin/rinkeby.json'
    break
}

console.log(chalk.green(`Selected network is ${ozNetworkName}`))

function loadContext() {
  return buildContext({
    projectConfig: '.openzeppelin/project.json',
    network: consoleNetwork,
    networkConfig,
    directory: 'build/contracts',
    verbose: false,
    mnemonic: process.env.HDWALLET_MNEMONIC
  })
}

const ozOptions = program.verbose ? '' : '-s'

async function runMigrate() {
  const context = loadContext()

  context.reload = function () {
    const newContext = loadContext()
    Object.assign(context, newContext)
  }

  await migrate(context, ozNetworkName, ozOptions)
}

runMigrate().catch(error => {
  console.error(`Could not migrate: ${error.message}`, error)
})
