import { ethers } from "hardhat"

export function runScript(script: () => Promise<any>) {
    script()
        .then(() => process.exit(0))
        .catch(error => {
            console.log(error)
            process.exit(1)
        })
}

export function runApp(app: () => Promise<any>) {
    app()
        .then(() => process.stdin.resume())
        .catch(error => {
            console.log(error)
            process.exit(1)
        })
}

export async function logBalance(address: string, ...tokens: string[]) {
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

export function addressEquals(address1: string, address2: string): boolean {
    return address1.toUpperCase() === address2.toUpperCase()
}

export const delay: (ms: number) => Promise<any> = ms => new Promise(resolve => setTimeout(resolve, ms, 0))