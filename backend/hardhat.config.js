require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

const AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || '';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // Only registered if credentials are present, so `npx hardhat compile`
    // works with zero config for local development.
    ...(AMOY_RPC_URL && DEPLOYER_PRIVATE_KEY
      ? {
          amoy: {
            url: AMOY_RPC_URL,
            accounts: [DEPLOYER_PRIVATE_KEY],
            chainId: 80002,
          },
        }
      : {}),
  },
};
