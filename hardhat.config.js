const { config } = require("dotenv");
config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  solc: {
    compilers: {
      download: {
        timeout: 60000,
      },
    },
  },
  networks: {
    // X Layer 测试网
    xlayerTestnet: {
      url: process.env.XLAYER_TESTNET_RPC || "https://testrpc.xlayer.tech",
      chainId: 1952,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 1000000000,
      timeout: 60000,
    },
    // X Layer 主网
    xlayerMainnet: {
      url: "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 1000000000,
      timeout: 60000,
    },
  },
  etherscan: {
    apiKey: {
      xlayerTestnet: process.env.XLAYER_API_KEY || "abc",
      xlayerMainnet: process.env.XLAYER_API_KEY || "abc",
    },
    customChains: [
      {
        network: "xlayerTestnet",
        chainId: 1952,
        urls: {
          apiURL: "https://www.okx.com/explorer/xlayer-test/api",
          browserURL: "https://www.okx.com/explorer/xlayer-test",
        },
      },
      {
        network: "xlayerMainnet",
        chainId: 196,
        urls: {
          apiURL: "https://www.okx.com/explorer/xlayer/api",
          browserURL: "https://www.okx.com/explorer/xlayer",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
