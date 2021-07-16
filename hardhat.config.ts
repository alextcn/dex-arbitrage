import * as dotenv from 'dotenv'
import '@nomiclabs/hardhat-waffle'
import { HardhatUserConfig, task } from "hardhat/config";
import { generateTokens } from './scripts/generate_tokens';

dotenv.config()


task('generate_tokens', 'Generates JSON file with ERC20 tokens based on list of input address')
  .addParam('inputFile', 'Input text file where each line is ERC20 token address', 'tokens2.txt', undefined, true)
  .addParam('outputFile', 'Output JSON file', 'tokens.json', undefined, true)
  .setAction(async (args, hre) => {
    await generateTokens(hre, args.inputFile, args.outputFile)
  })

const config: HardhatUserConfig = {
  networks: {
    main: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [ process.env.PRIVATE_KEY! ]
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [ process.env.PRIVATE_KEY! ]
    },
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [ process.env.PRIVATE_KEY! ]
    },
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
        // blockNumber: 12782450
      }
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.6.6"
      },
      {
        version: "0.7.0"
      }
    ]
  }
}

export default config