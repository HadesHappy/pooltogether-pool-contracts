const networks = {
  coverage: {
    url: 'http://127.0.0.1:8555',
    blockGasLimit: 200000000,
    allowUnlimitedContractSize: true
  },
  localhost: {
    chainId: 1,
    url: 'http://127.0.0.1:8545',
    allowUnlimitedContractSize: true,
    timeout: 1000 * 60
  }
}

if(process.env.ALCHEMY_URL && process.env.FORK_ENABLED){
  networks.hardhat = {
    allowUnlimitedContractSize: true,
    chainId: 1,
    forking: {
      url: process.env.ALCHEMY_URL
    },
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    },
    hardfork: 'london',
    gasPrice: 'auto'
  }
  if (process.env.FORK_BLOCK_NUMBER) {
    networks.hardhat.forking.blockNumber = parseInt(process.env.FORK_BLOCK_NUMBER)
  }
} else {
  networks.hardhat = {
    allowUnlimitedContractSize: true
  }
}

if (process.env.HDWALLET_MNEMONIC) {
  networks.xdai = {
    chainId: 100,
    url: 'https://rpc.xdaichain.com/',
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.poaSokol = {
    chainId: 77,
    url: 'https://sokol.poa.network',
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.matic = {
    chainId: 137,
    url: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.mumbai = {
    chainId: 80001,
    url: 'https://rpc-mumbai.maticvigil.com',
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.bsc = {
    chainId: 56,
    url: 'https://bsc-dataseed.binance.org',
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.bscTestnet = {
    chainId: 97,
    url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.celo = {
    chainId: 42220,
    url: 'https://forno.celo.org',
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.celoTestnet = {
    chainId: 44787,
    url: 'https://alfajores-forno.celo-testnet.org',
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
}

if (process.env.INFURA_API_KEY && process.env.HDWALLET_MNEMONIC) {
  networks.kovan = {
    url: `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }

  networks.ropsten = {
    url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }

  networks.rinkeby = {
    url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }

  networks.mainnet = {
    url: process.env.ALCHEMY_URL,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
} else {
  console.warn('No infura or hdwallet available for testnets')
}

module.exports = networks
