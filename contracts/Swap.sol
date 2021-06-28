// SPDX-License-Identifier: MIT
pragma solidity =0.6.6;

import '@uniswap/v2-periphery/contracts/UniswapV2Router02.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol';
import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';

contract Swap {
    IERC20 token0;
    IERC20 token1;
    UniswapV2Router02 uniRouter;

    constructor(address _uniRouter, address _token0, address _token1) public {
        require(_token0 != _token1);
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        uniRouter = UniswapV2Router02(payable(_uniRouter));
    }

    function swapToken0(uint amountIn) external {
        require(token0.allowance(msg.sender, address(this)) >= amountIn, 'not enough allowance');
        require(token0.transferFrom(msg.sender, address(this), amountIn), 'failed to transfer dai');
        require(token0.approve(address(uniRouter), amountIn), 'failed to approve dai to router');

        address[] memory path = new address[](2);
        path[0] = address(token0);
        path[1] = address(token1);

        // UniswapV2Library.

        uniRouter.swapExactTokensForTokens(amountIn, 0, path, msg.sender, block.timestamp);
    }

}