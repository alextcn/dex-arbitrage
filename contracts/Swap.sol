// SPDX-License-Identifier: MIT
pragma solidity =0.6.6;

import '@uniswap/v2-periphery/contracts/UniswapV2Router02.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol';

contract Swap {
    IERC20 DAI;
    UniswapV2Router02 uniRouter;

    constructor(address _DAI, address _uniRouter) public {
        DAI = IERC20(_DAI);
        uniRouter = UniswapV2Router02(payable(_uniRouter));
    }

    // todo: need to approve amountIn DAI to Swap contract before calling this?
    // Swaps DAI of sender for Ether
    function swapDAI(uint amountIn) external {
        // uint amountIn = 50 * 10 ** DAI.decimals();
        
        // transfer DAI from sender to this contract
        require(DAI.transferFrom(msg.sender, address(this), amountIn), 'failed to transfer dai from sender');
        
        // approve Uniswap to transfer DAI from this contract
        require(DAI.approve(address(uniRouter), amountIn), 'failed to approve dai to router');

        // swap DAI from this contract to sender via Uniswap
        address[] memory path = new address[](2);
        path[0] = address(DAI);
        path[1] = uniRouter.WETH();
        uniRouter.swapExactTokensForETH(amountIn, 0, path, msg.sender, block.timestamp);
    }

}