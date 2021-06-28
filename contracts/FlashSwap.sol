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

    address immutable factory;
    address immutable sushiFactory;
    IUniswapV2Router02 immutable sushiRouter;

    constructor(address _factory, address _sushiFactory, address _sushiRouter) public {
        factory = _factory;
        sushiFactory = _sushiFactory;
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
        address[] memory xpath = new address[](2);
        xpath[0] = path[1];
        xpath[1] = path[0];
        uint amountRequired = UniswapV2Library.getAmountsIn(factory, amountIn, xpath)[0];
        console.log("address(_sender) : %s", _sender);       // [sender EOA] 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
        console.log("address(msg.sender) : %s", msg.sender); // [WETH/DAI Uniswap pair contract] 0xa478c2975ab1ea89e8196811f51a7b7ade33eb11
        console.log("address(this) : %s", address(this));    // [flashswap contract] 0x9d4454B023096f34B160D6B654540c56A1F81688
        console.log("DAI amount in : %s", amountIn);         // 1000.000000000000000000 DAI
        console.log("WETH amount out: %s", amountRequired);  // 0.375028280292508693 WETH
        
        // DAI amount in                    :  1000 DAI
        // WETH amount required (to Uniswap): 0.375 WETH
        // DAI amount swapped               :   795 DAI

        // // make a swap on all amount of tokens
        // require(IERC20(path[0]).approve(address(sushiRouter), amountIn), "failed to approve amountIn tokens to sushi router");
        // uint amountSwapped = sushiRouter.swapExactTokensForTokens(amountIn, amountRequired, path, msg.sender, block.timestamp)[1];
        // console.log("WETH amount swapped: %s", amountSwapped);

        require(IERC20(path[0]).approve(address(sushiRouter), amountIn), "failed to approve amountIn tokens to sushi router");
        uint amountSwapped = sushiRouter.swapTokensForExactTokens(amountRequired, amountIn, path, msg.sender, block.timestamp)[0];
        console.log("DAI amount swapped: %s", amountSwapped);

        // [DAI] amount swapped is larger than amount required
        require(IERC20(path[0]).transfer(_sender, amountIn - amountSwapped), "failed to transfer rest of tokens to sender");
    }

}