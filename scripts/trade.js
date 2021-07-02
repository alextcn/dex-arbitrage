
const { runApp, addressEquals, logBalance } = require("./utils")
const cfg = require('../config.json')
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")


async function getPairContract(factoryAddress, tokenAAddress, tokenBAddress) {
    var factory = await ethers.getContractAt(
        '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory',
        factoryAddress
    )
    var pairAddress = await factory.getPair(tokenAAddress, tokenBAddress)
    return await ethers.getContractAt(
        '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair',
        pairAddress
    )
}

// pair is IUniswapV2Pair contract
async function fetchPairPrice(pair) {
    // reserveX is BigNumber
    const [reserveA, reserveB] = await pair.getReserves()
    // console.log(`[Sushi] (${reserveA.toString()}, ${reserveB.toString()})`)
    return {
        reserveA: reserveA,
        reserveB: reserveB,
        priceFormatted: reservesToPrice(reserveA, reserveB, 2)
    }
}

function reservesToPrice(reserveA, reserveB, precision) {
    const p = reserveA.mul(BigNumber.from(10).pow(precision)).div(reserveB)
    return ethers.utils.formatUnits(p, precision)
}

function timeTag() {
    const date = new Date()
    return `${date.toLocaleTimeString('en-US', { hour12: false })}:${date.getMilliseconds()}`
}

// TODO: support selling on Sushi
function calcTrade(uniPrice, sushiPrice) {
    const precision = 4
    const d = BigNumber.from(10).pow(precision)

    // price_diff(u, s) = (1000 * (u.reserve_a * s.reserve_b) / (u.reserve_b * s.reserve_a)) - 1000
    const priceDiff = d.mul(uniPrice.reserveA).mul(sushiPrice.reserveB).div(uniPrice.reserveB).div(sushiPrice.reserveA).sub(d)
    // order_size(PI%) ~= (pool_size * PI%) / 2
    const amountSellB = uniPrice.reserveB.mul(priceDiff).div(BigNumber.from(2)).div(d)
    const amountBorrowA = uniPrice.reserveA.mul(priceDiff).div(BigNumber.from(2)).div(d)

    return {
        priceDiffPercent: ethers.utils.formatUnits(priceDiff, precision - 2),
        amountSellB: amountSellB,
        amountBorrowA: amountBorrowA
    }
}


function logBlock(blockNumber, uniPrice, sushiPrice, trade) {
    console.log(`${timeTag()} #${blockNumber} [WETH/DAI]: 
        --- uni=${uniPrice.priceFormatted} (${uniPrice.reserveA}, ${uniPrice.reserveB}), 
        --- sushi=${sushiPrice.priceFormatted} (${sushiPrice.reserveA}, ${sushiPrice.reserveB}), 
        --- diff=${trade.priceDiffPercent}%,
        --- trade_size=${ethers.utils.formatUnits(trade.amountSellB, 18)} WETH
        --- amount_borrow=${ethers.utils.formatUnits(trade.amountBorrowA, 18)} DAI
    `)
}

async function main() {
    const flashSwapAddress = '0x4826533B4897376654Bb4d4AD88B7faFD0C98528' // must be uni_sell -> sushi_buy flashswap contract
    const senderAddress = await (await ethers.provider.getSigner()).getAddress()

    const uniPair = await getPairContract(cfg.uniFactory, cfg.WETH, cfg.DAI)
    const sushiPair = await getPairContract(cfg.sushiFactory, cfg.WETH, cfg.DAI)

    var isSwapping = false


    var checkPrices = async function (blockNumber) {
        const uniPrice = await fetchPairPrice(uniPair)
        const sushiPrice = await fetchPairPrice(sushiPair)
        
        // calc how much WETH to swap (considering Uniswap is larger)
        const trade = calcTrade(uniPrice, sushiPrice)
        const amountBorrowDAI = trade.amountBorrowA
        logBlock(blockNumber, uniPrice, sushiPrice, trade)

        if (isSwapping) return
        // swap if Uniswap price is higher than Sushiswap
        if (amountBorrowDAI.gte(BigNumber.from(0))) {
            isSwapping = true

            // prepare args
            const amount0 = addressEquals(await uniPair.token0(), cfg.DAI) ? amountBorrowDAI : BigNumber.from(0)
            const amount1 = addressEquals(await uniPair.token1(), cfg.DAI) ? amountBorrowDAI : BigNumber.from(0)
            const data = ethers.utils.randomBytes(2) // non-zero length random bytes are ok?
            
            try {
                // swap
                const tx = await uniPair.swap(amount0, amount1, flashSwapAddress, data)
                const receipt = await tx.wait()
                console.log(`Flashswap success: blockNumber = ${receipt.blockNumber}, status = ${receipt.status},tx = ${receipt.transactionHash}, gasUsed = ${receipt.gasUsed.toString()}`)
                await logBalance(senderAddress, cfg.WETH, cfg.DAI)
                process.exit(0) // turn the app off on successs
            } catch (error) {
                console.log(`Flashswap error: ${error}`)
            }

            isSwapping = false
        }
    }

    ethers.provider.on('block', checkPrices)


    // ethers.provider.on('block', async (blockNumber) => {
    //     if (isSwapping) return
    //     const uniPrice = await fetchPairPrice(uniPair)
    //     const sushiPrice = await fetchPairPrice(sushiPair)
        
    //     // calc how much WETH to swap (considering Uniswap is larger)
    //     const trade = calcTrade(uniPrice, sushiPrice)
    //     const amountBorrowDAI = trade.amountBorrowA
    //     logBlock(blockNumber, uniPrice, sushiPrice, trade)

    //     if (isSwapping) return
    //     // swap if Uniswap price is higher than Sushiswap
    //     if (amountBorrowDAI.gte(BigNumber.from(0))) {
    //         isSwapping = true

    //         // prepare args
    //         const amount0 = addressEquals(await uniPair.token0(), cfg.DAI) ? amountBorrowDAI : BigNumber.from(0)
    //         const amount1 = addressEquals(await uniPair.token1(), cfg.DAI) ? amountBorrowDAI : BigNumber.from(0)
    //         const data = ethers.utils.randomBytes(2) // non-zero length random bytes are ok?
            
    //         // swap
    //         try {
    //             const tx = await uniPair.swap(amount0, amount1, flashSwapAddress, data)
    //             const receipt = await tx.wait()
    //             console.log(`Flashswap success: blockNumber = ${receipt.blockNumber}, status = ${receipt.status},tx = ${receipt.transactionHash}, gasUsed = ${receipt.gasUsed.toString()}`)
    //             await logBalance(senderAddress, cfg.WETH, cfg.DAI)
    //         } catch (error) {
    //             console.log(`Flashswap error: ${error}`)
    //         }

    //         isSwapping = false
    //     }
    // })
}

runApp(main)