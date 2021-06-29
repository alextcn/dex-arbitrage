pragma solidity 0.6.6;

import { FlashLoanReceiverBase } from "./interfaces/aave/FlashLoanReceiverBase.sol";
import { ILendingPool } from "./interfaces/aave/ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "./interfaces/aave/ILendingPoolAddressesProvider.sol";
import { IERC20 } from "./interfaces/IERC20.sol";
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

import "hardhat/console.sol";

// TODO: 
// [ ] - swap by selling or buying
// Swaps tokens by selling on Uniswap and buying on Sushiswap using flash loan.
contract FlashLoanSwap is FlashLoanReceiverBase {

    IUniswapV2Router02 immutable uniRouter;
    IUniswapV2Router02 immutable sushiRouter;
    
    constructor(
        address _providerAddress,
        address _uniRouterAddress,
        address _sushiRouterAddress
    ) FlashLoanReceiverBase(_providerAddress) public {
        uniRouter = IUniswapV2Router02(_uniRouterAddress);
        sushiRouter = IUniswapV2Router02(_sushiRouterAddress);
    }

    // TODO: pass tokenTo in param
    // This function is called after your contract has received the flash loaned amount
    function executeOperation(
        address[] calldata assets, // borrowing token addresses
        uint256[] calldata amounts, // borrowing token amounts
        uint256[] calldata premiums, // debt for each borrowed token
        address initiator, // caller of LENDING_POOL.flashLoan()
        bytes calldata params
    ) external override returns (bool) {
        // now contract has borrowed WETH
        
        (address tokenToAddress, address sender) = abi.decode(params, (address, address));
        IERC20 tokenBorrowed = IERC20(assets[0]); // WETH
        IERC20 tokenTo = IERC20(tokenToAddress); // DAI
        uint amountBorrowed = amounts[0]; // amount of WETH
        uint amountOwing = amountBorrowed.add(premiums[0]); // amount of WETH

        console.log('Borrowed', amountBorrowed, tokenBorrowed.symbol());
        
        // WETH -> DAI (amount in borrowed from Aave)
        console.log('Selling', amountBorrowed, tokenBorrowed.symbol(), '...');
        address[] memory path = new address[](2);
        path[0] = address(tokenBorrowed);
        path[1] = address(tokenTo);
        require(tokenBorrowed.approve(address(uniRouter), amountBorrowed), 'failed to approve borrowed tokens swap');
        uint amountReceived = uniRouter.swapExactTokensForTokens(amountBorrowed, 0, path, address(this), block.timestamp)[1];
        console.log('Sold for', amountReceived, tokenTo.symbol());
        // now contract has DAI

        // DAI -> WETH (amount out is owing to Aave)
        console.log('Buying', amountOwing, tokenBorrowed.symbol(), '...');
        path[0] = address(tokenTo);
        path[1] = address(tokenBorrowed);
        require(tokenTo.approve(address(sushiRouter), amountReceived), 'failed to approve received tokens swap');
        uint amountSpent = sushiRouter.swapTokensForExactTokens(amountOwing, amountReceived, path, address(this), block.timestamp)[0];
        console.log('Bought for', amountSpent, tokenTo.symbol());
        // now contract has owing amount of WETH and profit of DAI

        // approve Aave pool allowance to transfer back the owed amount
        tokenBorrowed.approve(address(LENDING_POOL), amountOwing);

        // send profit to flash loan swap initiator
        uint amountProfit = amountReceived.sub(amountSpent); // DAI
        console.log('Sending profit of', amountProfit, tokenTo.symbol(), 'to sender...');
        tokenTo.transfer(sender, amountProfit);
        console.log('Profit sent!');

        // TODO: emit event with results

        return true;
    }
    
    function flashLoanSwap(address _tokenFrom, address _tokenTo, uint _amount) public {
        address receiverAddress = address(this); // who receives borrowing funds

        address[] memory assets = new address[](1); // addresses of borrowing reserves
        assets[0] = address(_tokenFrom);

        uint256[] memory amounts = new uint256[](1); // amounts of reserves to borros
        amounts[0] = _amount;

        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1); // types of dept for each token
        modes[0] = 0;

        address onBehalfOf = address(this); // who owes the debt (if mode != 0)
        bytes memory params = abi.encode(_tokenTo, msg.sender); // bytecoded params passed to executeOperation()
        uint16 referralCode = 0; // no used anymore


        console.log('calling LENDING_POOL.flashLoan():', address(LENDING_POOL));
        LENDING_POOL.flashLoan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
    }
}