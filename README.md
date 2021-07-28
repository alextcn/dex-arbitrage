## DEX arbitrage bot
The DEX arbitrage bot tracks price difference between DEX exchanges and calculates optimal trade size and profit.

#### Supported DEXs
- Uniswap V2
- Balancer V2
- Uniswap V3 (soon)

You can search for arbitrage opportunities across any pair of supported DEXs, such as Uniswap V2 & Sushiswap, Uniswap V2 & Balancer V2, Sushiswap & Balancer V2, etc.

#### Features
- Multiple exchanges, routes, and tokens
- Minimum trade profit
- Finds optimal trade size (binary search – soon)

## Install

#### 1. Install Hardhat  
<code>npm install --save-dev hardhat</code>  

#### 2. Create `.env` and set Alchemy API key to ALCHEMY_API_KEY

#### 3. Set Ethereum address private key to PRIVATE_KEY in `.env`

### Run

Run mainnet fork node on localhost: `npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/[API_KEY]`  

Deploy contracts: `npx hardhat --network localhost run scripts/deploy.js`  

Open console: `npx hardhat --network localhost console`  

Run bot: `npx hardhat --network localhost run scripts/trade.js`  
