const OKXService = require('./src/services/okxService');
require('dotenv').config();

// Initialize OKX client with your credentials
const okxClient = new OKXService(
    process.env.OKX_API_KEY,
    process.env.OKX_API_SECRET,
    process.env.OKX_PASSPHRASE,
    false // Live mode
);

async function testPositionSizing() {
    try {
        // Get account balance
        const balanceResponse = await okxClient.getBalance();
        const usdtBalance = balanceResponse[0]?.details?.find(d => d.ccy === 'USDT');
        const accountBalance = parseFloat(usdtBalance?.availBal || 0);
        console.log(`💰 Current balance: ${accountBalance.toFixed(2)} USDT`);

        // Test signal example (ETH position)
        const testSignal = {
            token: 'ETH',
            type: 'BUY',
            percentage: 7.38, // This is percentage of tracked wallet
            leverage: 3
        };

        const instrumentId = `${testSignal.token}-USDT-SWAP`;
        
        // Get instrument details
        const instrumentInfo = await okxClient.getInstrumentDetails(instrumentId);
        if (!instrumentInfo) {
            console.log(`⚠️ Could not get ${instrumentId} info`);
            return;
        }

        // Get current price
        const tickerArr = await okxClient.getTicker(instrumentId);
        const lastPrice = parseFloat(Array.isArray(tickerArr) ? tickerArr[0]?.last : tickerArr?.last);
        
        // Parse contract info
        const contractValue = parseFloat(instrumentInfo.ctVal);
        const lotSize = parseFloat(instrumentInfo.lotSz);
        const minSize = parseFloat(instrumentInfo.minSz);
        
        console.log(`\n📊 ${testSignal.token} Contract Info:`);
        console.log(`  Contract Value: ${contractValue} ${testSignal.token}`);
        console.log(`  Lot Size: ${lotSize} contracts`);
        console.log(`  Min Size: ${minSize} contracts`);
        console.log(`  Current Price: $${lastPrice}`);
        
        // Strategy 1: Use fixed percentage of our balance (e.g., 30% per trade)
        const FIXED_PERCENTAGE = 30; // Use 30% of balance per trade
        const sizeInUsdt1 = (accountBalance * FIXED_PERCENTAGE) / 100;
        
        // Strategy 2: Scale down the percentage proportionally
        // If tracked wallet is $81,519 and we have $14.46, scale factor is 14.46/81519 = 0.0001774
        const TRACKED_WALLET_VALUE = 81519; // From logs
        const scaleFactor = accountBalance / TRACKED_WALLET_VALUE;
        const scaledPercentage = testSignal.percentage * scaleFactor * 100; // Multiply by 100 to make it more reasonable
        const sizeInUsdt2 = (accountBalance * scaledPercentage) / 100;
        
        // Strategy 3: Use all available balance divided by number of expected positions
        const NUM_POSITIONS = 3; // Assume we want to open 3 positions max
        const sizeInUsdt3 = accountBalance / NUM_POSITIONS;
        
        console.log(`\n💡 Position Sizing Strategies:`);
        console.log(`  1. Fixed ${FIXED_PERCENTAGE}%: ${sizeInUsdt1.toFixed(2)} USDT`);
        console.log(`  2. Scaled percentage: ${sizeInUsdt2.toFixed(2)} USDT (${scaledPercentage.toFixed(2)}%)`);
        console.log(`  3. Balance/${NUM_POSITIONS}: ${sizeInUsdt3.toFixed(2)} USDT`);
        
        // Let's use Strategy 1 (Fixed percentage) for calculation
        const chosenSizeInUsdt = sizeInUsdt1;
        console.log(`\n✅ Using Strategy 1: ${chosenSizeInUsdt.toFixed(2)} USDT`);
        
        // Calculate contract size
        let sizeInContracts = chosenSizeInUsdt / (contractValue * lastPrice);
        console.log(`  Raw contracts: ${sizeInContracts}`);
        
        // Round to lot size
        sizeInContracts = Math.round(sizeInContracts / lotSize) * lotSize;
        console.log(`  Rounded to lot size: ${sizeInContracts}`);
        
        // Check minimum
        if (sizeInContracts < minSize) {
            sizeInContracts = minSize;
            console.log(`  Adjusted to min size: ${sizeInContracts}`);
        }
        
        // Format with proper decimals
        const decimalPlaces = lotSize < 1 ? Math.abs(Math.floor(Math.log10(lotSize))) : 0;
        const finalSize = sizeInContracts.toFixed(decimalPlaces);
        
        // Calculate actual USDT value
        const actualUsdt = sizeInContracts * contractValue * lastPrice;
        
        console.log(`\n📦 Final Order:`);
        console.log(`  Size: ${finalSize} contracts`);
        console.log(`  Value: ${actualUsdt.toFixed(2)} USDT`);
        console.log(`  Leverage: ${testSignal.leverage}x`);
        console.log(`  Margin Required: ${(actualUsdt / testSignal.leverage).toFixed(2)} USDT`);
        
        // Check if we have enough balance
        const marginRequired = actualUsdt / testSignal.leverage;
        if (marginRequired > accountBalance) {
            console.log(`\n❌ Insufficient balance! Need ${marginRequired.toFixed(2)} USDT, have ${accountBalance.toFixed(2)} USDT`);
        } else {
            console.log(`\n✅ Order is valid and can be placed!`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testPositionSizing();
