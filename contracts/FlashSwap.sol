// SPDX-License-Identifier: MIT
pragma solidity =0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol';

contract FlashSwap {
    address immutable factory;
    IUniswapV2Router02 immutable sushiRouter;

    constructor(address _factory, address _sushiRouter) public {
        factory = _factory;
        sushiRouter = IUniswapV2Router02(_sushiRouter);
    }

    // [+] 1. Calc required amount as amountOutMin for swap
    // [+] 2. Call SuchiRouter.swapExactTokensForTokens(...)
    //     - amountIn     -> _amount0/1 of tokens
    //     - amountOutMin -> required amount to repay loan
    //     - path         -> [ETH]/[DAI]
    //     - to           -> this contract or uniswap (msg.sender)
    // [+] 3. Send extra tokens from msg.sender or this contract to _sender (which one?)
    // [.] Is 'this' FlashSwap or UniswapV2Pair?
    // [ ] What about swap.deadline param?
    // [ ] Transfer from token0 or token1?

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
        require(msg.sender == UniswapV2Library.pairFor(factory, token0, token1), "Unauthorized");

        address[] memory path = new address[](2);
        path[0] = _amount0 == 0 ? token1 : token0; // token in
        path[1] = _amount0 == 0 ? token0 : token1; // token out

        // calculate minimum amount of tokenOut required to buy amountIn tokens of tokenIn
        uint amountRequired = UniswapV2Library.getAmountsIn(factory, amountIn, path)[0];
        
        // make a swap on all amount of tokens
        require(IERC20(path[0]).approve(address(sushiRouter), amountIn), "failed to approve amountIn tokens to sushi router");
        uint amountSwapped = sushiRouter.swapExactTokensForTokens(amountIn, amountRequired, path, msg.sender, block.timestamp)[1];

        // amount swapped is larger than amount required
        require(IERC20(path[1]).transfer(_sender, amountSwapped - amountRequired), "failed to transfer rest of tokens to sender");
    }

}