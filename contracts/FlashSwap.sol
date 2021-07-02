// SPDX-License-Identifier: MIT
pragma solidity =0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol';

import "hardhat/console.sol";

contract FlashSwap {
    using SafeMath for uint;

    address immutable uniFactory;
    address immutable sushiFactory;
    IUniswapV2Router02 immutable sushiRouter;

    constructor(address _uniFactory, address _sushiFactory, address _sushiRouter) public {
        uniFactory = _uniFactory;
        sushiFactory = _sushiFactory;
        sushiRouter = IUniswapV2Router02(_sushiRouter);
    }

    // This function is called byUniswapV2Pair contract after sending tokens to it.
    // Loan has to be repaid to msg.sender by the end of this function.
    // The contract returns amount of tokenOut that has to be paid for borrowed amountIn of tokenIn.
    //
    // - _sender is EOA, initiated UniswapV2Pair.swap(...) call that is called
    // - non-zero _amount0 or _amount1 represent tokens sent
    function uniswapV2Call(address _sender, uint _amount0, uint _amount1, bytes calldata _data) external {
        require(_amount0 == 0 || _amount1 == 0);
        uint amountIn = _amount0 == 0 ? _amount1 : _amount0;

        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        require(msg.sender == UniswapV2Library.pairFor(uniFactory, token0, token1), "Unauthorized");

        address[] memory path = new address[](2);
        path[0] = _amount0 == 0 ? token1 : token0; // token in
        path[1] = _amount0 == 0 ? token0 : token1; // token out

        // calculate minimum amount of tokenOut required to buy amountIn tokens of tokenIn
        address[] memory xpath = new address[](2);
        xpath[0] = path[1];
        xpath[1] = path[0];
        uint amountRequired = UniswapV2Library.getAmountsIn(uniFactory, amountIn, xpath)[0];
        console.log("DAI amount borrowed : %s", amountIn);         // 168847.659628982957226212 DAI
        console.log("WETH amount to return: %s", amountRequired);  //     80.587377847518766166 WETH
        
        // DAI amount in                    :  1000 DAI
        // WETH amount required (to Uniswap): 0.375 WETH
        // DAI amount swapped               :   795 DAI

        // // make a swap on all amount of tokens
        // require(IERC20(path[0]).approve(address(sushiRouter), amountIn), "failed to approve amountIn tokens to sushi router");
        // uint amountSwapped = sushiRouter.swapExactTokensForTokens(amountIn, amountRequired, path, msg.sender, block.timestamp)[1];
        // console.log("WETH amount swapped: %s", amountSwapped);


        // sushiRouter.swap(      129.324823465989037560, 271631.593358135442990898)
        // sushi reserves: (109110545.739018368094370093,  52144.835879285270057318)
        // uint numerator = reserveIn.mul(amountOut).mul(1000); // (109110545.74 * 129.3 * 1000) / ((52144.83 - 129.32) * 997) + 1
        // uint denominator = reserveOut.sub(amountOut).mul(997); // 
        // amountIn = (numerator / denominator).add(1); // 272043.8
        // ...
        // require(amounts[0] <= amountInMax, 'UniswapV2Router: EXCESSIVE_INPUT_AMOUNT'); // 272043.8 <= 271631.6 – FALSE
        
        // minimum amount of DAI required to swap for amountRequired of WETH on Sushiswap 
        // is less than max amount of DAI i'm we have

        require(IERC20(path[0]).approve(address(sushiRouter), amountIn), "failed to approve amountIn tokens to sushi router");
        uint amountSwapped = sushiRouter.swapTokensForExactTokens(amountRequired, amountIn, path, msg.sender, block.timestamp)[0];
        console.log("DAI amount swapped: %s", amountSwapped);

        // [DAI] amount swapped is larger than amount required
        require(IERC20(path[0]).transfer(_sender, amountIn - amountSwapped), "failed to transfer rest of tokens to sender");
    }

}