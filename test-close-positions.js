const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const positionSignalService = require('./src/services/positionSignalService');
const strategyEngine = require('./src/core/strategyEngine');

async function generateFakeSellSignals() {
    console.log('🔥 Generating fake SELL signals to close positions and open shorts...\n');
    
    // Fake SELL signals for the positions we opened
    // These will close our LONG positions and open SHORT positions
    const fakeSellSignals = [
        {
            token: 'ETH',
            type: 'SELL',  // This will close the LONG and open a SHORT
            percentage: 7.38,  // Same percentage as original
            leverage: 1,  // 1x leverage for SHORT as requested
            value: 6018.21,
            timestamp: new Date()
        },
        {
            token: 'AVAX',
            type: 'SELL',
            percentage: 7.38,
            leverage: 1,
            value: 6018.21,
            timestamp: new Date()
        },
        {
            token: 'ZRO',
            type: 'SELL',
            percentage: 2.45,
            leverage: 1,
            value: 2000.65,
            timestamp: new Date()
        },
        {
            token: 'RESOLV',
            type: 'SELL',
            percentage: 1.23,
            leverage: 1,
            value: 999.50,
            timestamp: new Date()
        }
    ];
    
    // Get the active strategy
    const strategy = await prisma.strategy.findFirst({
        where: { isActive: true }
    });
    
    if (!strategy) {
        console.log('❌ No active strategy found');
        return;
    }
    
    console.log(`📊 Strategy: ${strategy.name} (${strategy.walletAddress})`);
    console.log(`💼 Processing ${fakeSellSignals.length} SELL signals...\n`);
    
    // Load strategies in the engine
    await strategyEngine.loadStrategies();
    
    // We need to process these signals through the strategy engine
    // First, let's inject them into the position signal service's response
    
    // Monkey-patch the getNewPositionSignals to return our fake signals
    const originalGetNewPositionSignals = positionSignalService.getNewPositionSignals;
    positionSignalService.getNewPositionSignals = async (walletAddress, lastChecked) => {
        console.log('📨 Injecting fake SELL signals...');
        return fakeSellSignals;
    };
    
    // Run the signal check once
    await strategyEngine.runSignalCheck();
    
    // Restore the original function
    positionSignalService.getNewPositionSignals = originalGetNewPositionSignals;
    
    console.log('\n✅ Fake signals processed!');
    console.log('Check your OKX account to verify:');
    console.log('  1. LONG positions should be closed');
    console.log('  2. SHORT positions should be opened with 1x leverage');
}

// Run the test
generateFakeSellSignals()
    .then(() => {
        console.log('\n🏁 Test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
