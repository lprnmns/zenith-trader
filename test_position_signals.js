const positionSignalService = require('./src/services/positionSignalService');

async function testPositionSignals() {
  console.log('🧪 Position Signal Service Test');
  console.log('===============================\n');

  // Test wallet address (Vitalik's wallet)
  const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  
  try {
    console.log('📊 İlk sinyal kontrolü (cache boş):');
    console.log('─'.repeat(50));
    
    const signals1 = await positionSignalService.getNewPositionSignals(testAddress, new Date(Date.now() - 24*60*60*1000));
    console.log(`✅ İlk kontrol tamamlandı. ${signals1.length} sinyal bulundu.`);
    
    console.log('\n📊 Cache durumu:');
    const cacheStatus = positionSignalService.getCacheStatus(testAddress);
    console.log('   Cache var mı:', cacheStatus.hasCache);
    console.log('   Trade sayısı:', cacheStatus.tradeCount);
    
    console.log('\n📊 İkinci sinyal kontrolü (cache dolu):');
    console.log('─'.repeat(50));
    
    const signals2 = await positionSignalService.getNewPositionSignals(testAddress, new Date(Date.now() - 24*60*60*1000));
    console.log(`✅ İkinci kontrol tamamlandı. ${signals2.length} yeni sinyal bulundu.`);
    
    console.log('\n📊 Cache temizleme testi:');
    console.log('─'.repeat(50));
    
    positionSignalService.clearCache(testAddress);
    const cacheStatusAfter = positionSignalService.getCacheStatus(testAddress);
    console.log('   Cache var mı:', cacheStatusAfter.hasCache);
    console.log('   Trade sayısı:', cacheStatusAfter.tradeCount);
    
    console.log('\n🎯 Test tamamlandı!');
    
  } catch (error) {
    console.error('❌ Test başarısız:', error.message);
  }
}

testPositionSignals().catch(console.error);
