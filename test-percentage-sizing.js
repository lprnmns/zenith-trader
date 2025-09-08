const OKXService = require('./src/services/okxService');
require('dotenv').config();

// Initialize OKX client
const okxClient = new OKXService(
    process.env.OKX_API_KEY,
    process.env.OKX_API_SECRET,
    process.env.OKX_PASSPHRASE,
    false // Live mode
);

async function testPercentageSizing() {
    try {
        // Get account balance
        const balanceResponse = await okxClient.getBalance();
        const usdtBalance = balanceResponse[0]?.details?.find(d => d.ccy === 'USDT');
        const accountBalance = parseFloat(usdtBalance?.availBal || 0);
        console.log(`💰 Current balance: ${accountBalance.toFixed(2)} USDT\n`);

        // Test different percentage scenarios
        const testScenarios = [
            { token: 'ETH', percentage: 7.38, type: 'BUY', leverage: 3 },  // Wallet uses 7.38%
            { token: 'BTC', percentage: 49.08, type: 'BUY', leverage: 3 }, // Wallet uses 49.08%
            { token: 'AVAX', percentage: 2.45, type: 'BUY', leverage: 3 }, // Wallet uses 2.45%
            { token: 'ETH', percentage: 7.38, type: 'SELL', leverage: 1 }  // Closing + short
        ];

        console.log('📊 Testing percentage-based sizing:\n');
        console.log('=' .repeat(60));
        
        for (const scenario of testScenarios) {
            const { token, percentage, type, leverage } = scenario;
            
            // Calculate position size based on wallet percentage
            const sizeInUsdt = (accountBalance * percentage) / 100;
            const marginRequired = sizeInUsdt / leverage;
            
            console.log(`\n${type === 'BUY' ? '🟢 LONG' : '🔴 SHORT'} Signal: ${token}`);
            console.log(`  Wallet percentage: ${percentage.toFixed(2)}%`);
            console.log(`  Our balance: ${accountBalance.toFixed(2)} USDT`);
            console.log(`  Position size: ${sizeInUsdt.toFixed(2)} USDT (${percentage.toFixed(2)}% of our balance)`);
            console.log(`  Leverage: ${leverage}x`);
            console.log(`  Margin required: ${marginRequired.toFixed(2)} USDT`);
            
            // Check if we have enough balance
            if (marginRequired > accountBalance) {
                console.log(`  ❌ INSUFFICIENT BALANCE!`);
            } else {
                console.log(`  ✅ Can execute (margin ${marginRequired.toFixed(2)} < balance ${accountBalance.toFixed(2)})`);
            }
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('\n💡 Summary:');
        console.log('- Each position uses the EXACT same percentage as the tracked wallet');
        console.log('- LONG positions: 3x leverage');
        console.log('- SHORT positions (after closing LONG): 1x leverage');
        console.log('- Example: If wallet trades 7% of their portfolio, we use 7% of ours');
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testPercentageSizing();
