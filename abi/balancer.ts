export const vault = [
    'function getPool(bytes32 poolId) external view returns (address, uint8)',
    'function getPoolTokens(bytes32 poolId) external view returns (address[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock)'
]

export const pool = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function getNormalizedWeights() external view returns (uint256[] memory)",
    "function getSwapFeePercentage() external view returns (uint256)"
]