const HDWalletProvider = require('@truffle/hdwallet-provider')
const config = require('dotenv').config()
const fs = require('fs')
const mnemonic = fs.readFileSync('.secret').toString().trim()

const {
  MAINNET_RPC,
  MAINNET_ID,
  TESTNET_RPC,
  TESTNET_ID,
  ETHERSCAN_API_KEY,
  BSCSCAN_API_KEY,
  POLYGON_API_KEY,
  CRONOS_API_KEY,
} = config.parsed

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*',
    },
    mainnet: {
      provider: () => new HDWalletProvider(mnemonic, MAINNET_RPC),
      network_id: MAINNET_ID,
      // gas: 5500000,
      // gasPrice: 5000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    testnet: {
      provider: () => new HDWalletProvider(mnemonic, TESTNET_RPC),
      network_id: TESTNET_ID,
      // ARBITRUM issues
      // gas: 648666600,
      // gasPrice: 100000000000000000,
      confirmations: 1,
      timeoutBlocks: 150,
      skipDryRun: true,
    },
  },
  compilers: {
    solc: {
      version: '0.8.0',
      settings: {
        optimizer: {
          enabled: true,
          runs: 99999,
        },
        evmVersion: 'istanbul',
      },
    },
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: {
    etherscan: ETHERSCAN_API_KEY,
    bscscan: BSCSCAN_API_KEY,
    polygonscan: POLYGON_API_KEY,
    cronoscan: CRONOS_API_KEY,
  },
}
