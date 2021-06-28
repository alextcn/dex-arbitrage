
function runScript(script) {
    script()
        .then(() => process.exit(0))
        .catch(error => {
            console.log(error)
            process.exit(1)
        })
}

async function logBalance(address, ...tokens) {
    console.log(`Balance of ${address}:`)
    const ethBalance = await ethers.provider.getBalance(address)
    console.log(`--- ETH: ${ethers.utils.formatEther(ethBalance)}`)

    for (const tokenAddress of tokens) {
        const token = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', tokenAddress)
        const decimals = await token.decimals()
        const symbol = await token.symbol()
        const balance = await token.balanceOf(address)
        console.log(`--- ${symbol}: ${ethers.utils.formatUnits(balance, decimals)}`)
    }
}

function addressEquals(address1, address2) {
    return address1.toUpperCase() === address2.toUpperCase()
}

module.exports = {
    runScript,
    logBalance,
    addressEquals
}