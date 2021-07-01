require('dotenv').config()
require("@nomiclabs/hardhat-waffle")

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    main: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [ process.env.PRIVATE_KEY ]
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [ process.env.PRIVATE_KEY ]
    },
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [ process.env.PRIVATE_KEY ]
    }
  },
  solidity: "0.6.6",
}