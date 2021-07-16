
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import fs from 'fs'
import { Token } from '../src/token'

/** Read ERC20 token addresses from 'inputFile' and exports tokens with metadata into 'outputFile'. */
export async function generateTokens(hre: HardhatRuntimeEnvironment, inputFile: string, outputFile: string) {
    if (!inputFile || !outputFile) throw 'inputFile and outputFile arguments are required'
    
    const addresses = readAddresses(inputFile)

    const tokens: Token[] = []
    for (var i = 0; i < addresses.length; i++) {
        const token = await buildToken(hre, addresses[i])
        tokens.push(token)
    }

    const tokenObjects: { [key: string]: any } = {}
    tokens.sort((t0, t1) => t0.name.localeCompare(t1.name)).map(function(token) {
        tokenObjects[token.symbol] = {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals
        }
    })

    const output = JSON.stringify(tokenObjects, null, '\t')
    fs.writeFileSync(outputFile, output)
}


function readAddresses(filePath: string): string[] {
    return fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean)
}

async function buildToken(hre: HardhatRuntimeEnvironment, address: string): Promise<Token> {
    // TODO: use custom abi
    const token = await hre.ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', address)
    const name = (await token.name()) as string
    const symbol = (await token.symbol()) as string
    const decimals = (await token.decimals()) as number
    return new Token(address, name, symbol, decimals)
}
