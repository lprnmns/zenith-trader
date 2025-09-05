const analysisService = require('./src/services/analysisService');
const zerionService = require('./src/services/zerionService');

async function analyzeTestWallet() {
  console.log('🔍 Test Cüzdanı Position Ledger Analizi');
  console.log('========================================\n');

  const testAddress = '0xc82b2e484b161d20eae386877d57c4e5807b5581';
  
  try {
    console.log(`📊 Cüzdan: ${testAddress}`);
    console.log('─'.repeat(60));

    // 1. Cüzdan toplam değerini al
    console.log('💰 Cüzdan toplam değeri alınıyor...');
    const totalValue = await zerionService.getWalletTotalValueUsd(testAddress);
    console.log(`✅ Toplam değer: $${totalValue?.toFixed(2) || 'N/A'}`);
    console.log('');

    // 2. Position Ledger analizi
    console.log('📈 Position Ledger analizi yapılıyor...');
    const analysis = await analysisService.analyzeWallet(testAddress);
    
    if (!analysis || !analysis.tradeHistory) {
      console.log('❌ Analiz bulunamadı');
      return;
    }

    console.log(`✅ Analiz tamamlandı. ${analysis.tradeHistory.length} işlem bulundu.`);
    console.log('');

    // 3. Son 10 işlemi göster
    console.log('📋 Son 10 İşlem:');
    console.log('─'.repeat(80));
    
    const recentTrades = analysis.tradeHistory
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    for (let i = 0; i < recentTrades.length; i++) {
      const trade = recentTrades[i];
      const positionPercentage = totalValue ? ((trade.amountUsd / totalValue) * 100) : 0;
      
      console.log(`${i + 1}. ${trade.action} ${trade.asset}`);
      console.log(`   📅 Tarih: ${trade.date}`);
      console.log(`   💰 Miktar: $${trade.amountUsd?.toFixed(2) || 'N/A'}`);
      console.log(`   📊 Yüzde: ${positionPercentage.toFixed(2)}%`);
      console.log(`   🏷️ ID: ${trade.id}`);
      console.log(`   📈 Durum: ${trade.status}`);
      
      if (trade.sales && trade.sales.length > 0) {
        console.log(`   🔴 Satışlar: ${trade.sales.length} adet`);
        trade.sales.forEach((sale, idx) => {
          const salePercentage = totalValue ? ((sale.amountSoldUsd / totalValue) * 100) : 0;
          console.log(`      ${idx + 1}. ${sale.date} - $${sale.amountSoldUsd?.toFixed(2) || 'N/A'} (${salePercentage.toFixed(2)}%)`);
        });
      }
      console.log('');
    }

    // 4. Özet istatistikler
    console.log('📊 Özet İstatistikler:');
    console.log('─'.repeat(40));
    
    const buyTrades = recentTrades.filter(t => t.action === 'BUY');
    const sellTrades = recentTrades.filter(t => t.sales && t.sales.length > 0);
    
    console.log(`📈 Alım işlemleri: ${buyTrades.length}`);
    console.log(`📉 Satış işlemleri: ${sellTrades.length}`);
    
    const totalBuyValue = buyTrades.reduce((sum, t) => sum + (t.amountUsd || 0), 0);
    const totalSellValue = sellTrades.reduce((sum, t) => {
      return sum + (t.sales?.reduce((saleSum, s) => saleSum + (s.amountSoldUsd || 0), 0) || 0);
    }, 0);
    
    console.log(`💰 Toplam alım değeri: $${totalBuyValue.toFixed(2)}`);
    console.log(`💰 Toplam satış değeri: $${totalSellValue.toFixed(2)}`);
    
    // 5. Sinyal formatında göster
    console.log('\n🎯 Sinyal Formatında:');
    console.log('─'.repeat(60));
    
    for (let i = 0; i < recentTrades.length; i++) {
      const trade = recentTrades[i];
      const positionPercentage = totalValue ? ((trade.amountUsd / totalValue) * 100) : 0;
      
      if (trade.action === 'BUY' && trade.amountUsd >= 10) {
        console.log(`${i + 1}. 🟢 LONG Sinyali:`);
        console.log(`   Token: ${trade.asset}`);
        console.log(`   Miktar: $${trade.amountUsd.toFixed(2)}`);
        console.log(`   Yüzde: ${positionPercentage.toFixed(2)}%`);
        console.log(`   Kaldıraç: 3x`);
        console.log(`   ID: ${trade.id}`);
        console.log('');
      }
      
      if (trade.sales && trade.sales.length > 0) {
        trade.sales.forEach((sale, idx) => {
          const salePercentage = totalValue ? ((sale.amountSoldUsd / totalValue) * 100) : 0;
          if (sale.amountSoldUsd >= 10) {
            console.log(`${i + 1}.${idx + 1}. 🔴 SHORT Sinyali:`);
            console.log(`   Token: ${trade.asset}`);
            console.log(`   Miktar: $${sale.amountSoldUsd.toFixed(2)}`);
            console.log(`   Yüzde: ${salePercentage.toFixed(2)}%`);
            console.log(`   Kaldıraç: 1x`);
            console.log(`   ID: ${trade.id}-sale-${sale.date}`);
            console.log('');
          }
        });
      }
    }

    console.log('🎯 Analiz tamamlandı!');
    
  } catch (error) {
    console.error('❌ Analiz başarısız:', error.message);
  }
}

analyzeTestWallet().catch(console.error);
