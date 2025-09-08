// Test token mapping from DEX to CEX

const tokenMapping = {
    'WBTC': 'BTC',     // Wrapped BTC -> BTC
    'WETH': 'ETH',     // Wrapped ETH -> ETH
    'WMATIC': 'MATIC', // Wrapped MATIC -> MATIC
    'WAVAX': 'AVAX',   // Wrapped AVAX -> AVAX
    'WBNB': 'BNB',     // Wrapped BNB -> BNB
    'stETH': 'ETH',    // Staked ETH -> ETH
    'cbETH': 'ETH',    // Coinbase ETH -> ETH
    'rETH': 'ETH',     // Rocket Pool ETH -> ETH
    'USDC': 'USDT',    // USDC -> USDT (OKX futures genelde USDT)
    'USDC.e': 'USDT',  // Bridged USDC -> USDT
    'DAI': 'USDT',     // DAI -> USDT
    'BUSD': 'USDT',    // BUSD -> USDT
    'FRAX': 'USDT',    // FRAX -> USDT
};

console.log('🔄 Token Mapping Test\n');
console.log('=' .repeat(50));

// Test signals from DEX
const testSignals = [
    { token: 'WBTC', type: 'BUY', percentage: 49.08 },
    { token: 'WETH', type: 'BUY', percentage: 3.68 },
    { token: 'ETH', type: 'BUY', percentage: 7.38 },
    { token: 'BTC', type: 'BUY', percentage: 10.00 },
    { token: 'stETH', type: 'SELL', percentage: 5.00 },
    { token: 'USDC', type: 'BUY', percentage: 20.00 },
    { token: 'AVAX', type: 'BUY', percentage: 7.38 },
    { token: 'WAVAX', type: 'BUY', percentage: 1.23 },
    { token: 'MNT', type: 'BUY', percentage: 6.13 },
    { token: 'ZRO', type: 'BUY', percentage: 2.45 },
];

console.log('\nDEX Signal -> OKX Instrument:\n');

for (const signal of testSignals) {
    const okxToken = tokenMapping[signal.token] || signal.token;
    const instrumentId = `${okxToken}-USDT-SWAP`;
    
    if (okxToken !== signal.token) {
        console.log(`✅ ${signal.token.padEnd(8)} -> ${okxToken.padEnd(8)} -> ${instrumentId}`);
    } else {
        console.log(`   ${signal.token.padEnd(8)} -> ${okxToken.padEnd(8)} -> ${instrumentId}`);
    }
}

console.log('\n' + '=' .repeat(50));
console.log('\n💡 Summary:');
console.log('- Wrapped tokens (WBTC, WETH, etc.) mapped to base tokens');
console.log('- Stablecoins (USDC, DAI, etc.) mapped to USDT');
console.log('- Unknown tokens pass through unchanged');
console.log('- OKX will reject if instrument doesn\'t exist');
