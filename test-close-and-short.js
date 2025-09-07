const OKXService = require('./src/services/okxService');
require('dotenv').config();

// Initialize OKX client
const okxClient = new OKXService(
    process.env.OKX_API_KEY,
    process.env.OKX_API_SECRET,
    process.env.OKX_PASSPHRASE,
    false // Live mode
);

async function closePositionsAndOpenShorts() {
    try {
        console.log('🔍 Fetching current positions...\n');
        
        // Get current positions
        const positions = await okxClient.getPositions();
        
        if (!positions || positions.length === 0) {
            console.log('❌ No open positions found');
            return;
        }
        
        console.log(`📊 Found ${positions.length} open positions:\n`);
        
        // Get current balance before operations
        const balanceResponse = await okxClient.getBalance();
        const usdtBalance = balanceResponse[0]?.details?.find(d => d.ccy === 'USDT');
        const initialBalance = parseFloat(usdtBalance?.availBal || 0);
        console.log(`💰 Initial balance: ${initialBalance.toFixed(2)} USDT\n`);
        
        for (const position of positions) {
            const instId = position.instId;
            const posSide = position.posSide; // 'long' or 'short'
            const availPos = Math.abs(parseFloat(position.availPos)); // Available position to close
            const token = instId.split('-')[0]; // Extract token from instId
            
            console.log(`\n📌 Position: ${token}`);
            console.log(`  Side: ${posSide.toUpperCase()}`);
            console.log(`  Size: ${availPos} contracts`);
            console.log(`  Unrealized PnL: ${parseFloat(position.upl).toFixed(2)} USDT`);
            
            if (availPos <= 0) {
                console.log(`  ⚠️ No available position to close`);
                continue;
            }
            
            // Step 1: Close the existing position
            // To close a LONG, we SELL. To close a SHORT, we BUY.
            const closeSide = posSide === 'long' ? 'sell' : 'buy';
            
            console.log(`\n  🔄 Closing ${posSide.toUpperCase()} position...`);
            
            try {
                // Get instrument info for proper sizing
                const instrumentInfo = await okxClient.getInstrumentDetails(instId);
                const lotSize = parseFloat(instrumentInfo.lotSz);
                const decimalPlaces = lotSize < 1 ? Math.abs(Math.floor(Math.log10(lotSize))) : 0;
                const closeSize = availPos.toFixed(decimalPlaces);
                
                const closeOrderResponse = await okxClient.submitOrder(
                    instId,
                    'isolated',
                    closeSide,
                    posSide, // Same posSide to close
                    'market',
                    closeSize
                );
                
                if (closeOrderResponse?.code === '0') {
                    const orderId = closeOrderResponse.data[0]?.ordId;
                    console.log(`  ✅ Close order placed: ${orderId}`);
                } else {
                    console.log(`  ❌ Failed to close: ${closeOrderResponse?.msg}`);
                    continue;
                }
                
                // Wait a bit for the order to execute
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.log(`  ❌ Error closing position: ${error.message}`);
                continue;
            }
            
            // Step 2: Open a SHORT position with 1x leverage (only if we closed a LONG)
            if (posSide === 'long') {
                console.log(`\n  📉 Opening SHORT position with 1x leverage...`);
                
                try {
                    // Set leverage to 1x for short
                    await okxClient.setLeverage(instId, '1', 'isolated', 'short');
                    console.log(`  ✅ Leverage set to 1x`);
                    
                    // Get current balance for sizing
                    const balanceResponse = await okxClient.getBalance();
                    const usdtBalance = balanceResponse[0]?.details?.find(d => d.ccy === 'USDT');
                    const currentBalance = parseFloat(usdtBalance?.availBal || 0);
                    
                    // Get current price
                    const tickerArr = await okxClient.getTicker(instId);
                    const lastPrice = parseFloat(Array.isArray(tickerArr) ? tickerArr[0]?.last : tickerArr?.last);
                    
                    // Get instrument details
                    const instrumentInfo = await okxClient.getInstrumentDetails(instId);
                    const contractValue = parseFloat(instrumentInfo.ctVal);
                    const lotSize = parseFloat(instrumentInfo.lotSz);
                    const minSize = parseFloat(instrumentInfo.minSz);
                    
                    // Calculate position size (use 30% of balance or minimum 3 USDT)
                    const POSITION_SIZE_PERCENTAGE = 30;
                    let sizeInUsdt = Math.max((currentBalance * POSITION_SIZE_PERCENTAGE) / 100, 3);
                    
                    // Make sure we don't exceed available balance with 1x leverage
                    sizeInUsdt = Math.min(sizeInUsdt, currentBalance * 0.9); // Use max 90% of balance
                    
                    // Calculate contracts
                    let sizeInContracts = sizeInUsdt / (contractValue * lastPrice);
                    
                    // Round to lot size
                    sizeInContracts = Math.round(sizeInContracts / lotSize) * lotSize;
                    
                    // Check minimum
                    if (sizeInContracts < minSize) {
                        sizeInContracts = minSize;
                    }
                    
                    // Format size
                    const decimalPlaces = lotSize < 1 ? Math.abs(Math.floor(Math.log10(lotSize))) : 0;
                    const shortSize = sizeInContracts.toFixed(decimalPlaces);
                    
                    const actualUsdt = sizeInContracts * contractValue * lastPrice;
                    
                    console.log(`  📊 Short details:`);
                    console.log(`    Size: ${shortSize} contracts`);
                    console.log(`    Value: ${actualUsdt.toFixed(2)} USDT`);
                    console.log(`    Margin: ${actualUsdt.toFixed(2)} USDT (1x leverage)`);
                    
                    // Check if we have enough balance
                    if (actualUsdt > currentBalance) {
                        console.log(`  ⚠️ Insufficient balance for short (need ${actualUsdt.toFixed(2)}, have ${currentBalance.toFixed(2)})`);
                        continue;
                    }
                    
                    // Place SHORT order
                    const shortOrderResponse = await okxClient.submitOrder(
                        instId,
                        'isolated',
                        'sell',
                        'short',
                        'market',
                        shortSize
                    );
                    
                    if (shortOrderResponse?.code === '0') {
                        const orderId = shortOrderResponse.data[0]?.ordId;
                        console.log(`  ✅ SHORT order placed: ${orderId}`);
                    } else {
                        console.log(`  ❌ Failed to open short: ${shortOrderResponse?.msg}`);
                    }
                    
                } catch (error) {
                    console.log(`  ❌ Error opening short: ${error.message}`);
                }
            }
        }
        
        // Final balance check
        console.log('\n\n📊 Final Status:');
        const finalBalanceResponse = await okxClient.getBalance();
        const finalUsdtBalance = finalBalanceResponse[0]?.details?.find(d => d.ccy === 'USDT');
        const finalBalance = parseFloat(finalUsdtBalance?.availBal || 0);
        console.log(`💰 Final balance: ${finalBalance.toFixed(2)} USDT`);
        console.log(`💱 Balance change: ${(finalBalance - initialBalance).toFixed(2)} USDT`);
        
        // Check new positions
        console.log('\n🔍 Checking new positions...');
        const newPositions = await okxClient.getPositions();
        if (newPositions && newPositions.length > 0) {
            console.log(`\n📌 Current positions:`);
            for (const pos of newPositions) {
                const token = pos.instId.split('-')[0];
                console.log(`  ${token}: ${pos.posSide.toUpperCase()} ${Math.abs(parseFloat(pos.availPos))} contracts`);
            }
        } else {
            console.log('No open positions');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the script
closePositionsAndOpenShorts()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
