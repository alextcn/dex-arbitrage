### DEX arbitrage bot
Arbitrage bot that tracks price difference between Uniswap and Sushiswap and make a flashswap to balance prices.

### Install

#### 1. Install Hardhat  
<code>npm install --save-dev hardhat</code>  

#### 2. Create `.env` and set Alchemy API key to ALCHEMY_API_KEY

#### 3. Set Ethereum address private key to PRIVATE_KEY in `.env`

### Run

Run mainnet fork node on localhost: `npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/[API_KEY]`  

Deploy contracts: `npx hardhat --network localhost run scripts/deploy.js`  

Open console: `npx hardhat --network localhost console`  

Run bot: `npx hardhat --network localhost run scripts/trade.js`  
