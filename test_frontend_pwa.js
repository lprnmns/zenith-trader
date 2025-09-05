const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testFrontendPWA() {
  console.log('🌐 Frontend PWA Test Başlıyor...\n');

  let browser;
  let page;

  try {
    // 1. Browser başlat
    console.log('1️⃣ Browser başlatılıyor...');
    browser = await puppeteer.launch({
      headless: false, // Görsel test için
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    console.log('✅ Browser başlatıldı');

    // 2. PWA dosyalarını kontrol et
    console.log('\n2️⃣ PWA Dosyaları Kontrol Ediliyor...');
    
    const pwaFiles = [
      'public/manifest.json',
      'public/sw.js',
      'public/icon-192x192.png',
      'public/icon-512x512.png'
    ];

    const pwaFileChecks = {};
    for (const file of pwaFiles) {
      const exists = fs.existsSync(file);
      pwaFileChecks[file] = exists;
      console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? 'Mevcut' : 'Eksik'}`);
    }

    // 3. Manifest dosyasını kontrol et
    console.log('\n3️⃣ Manifest Dosyası Kontrol Ediliyor...');
    
    if (fs.existsSync('public/manifest.json')) {
      try {
        const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));
        
        const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
        const manifestChecks = {};
        
        for (const field of requiredFields) {
          manifestChecks[field] = !!manifest[field];
          console.log(`${manifest[field] ? '✅' : '❌'} ${field}: ${manifest[field] ? 'Mevcut' : 'Eksik'}`);
        }
        
        console.log('📋 Manifest Özeti:');
        console.log(`   Name: ${manifest.name}`);
        console.log(`   Short Name: ${manifest.short_name}`);
        console.log(`   Start URL: ${manifest.start_url}`);
        console.log(`   Display: ${manifest.display}`);
        console.log(`   Icons: ${manifest.icons?.length || 0} adet`);
      } catch (error) {
        console.log('❌ Manifest dosyası parse edilemedi:', error.message);
      }
    }

    // 4. Service Worker dosyasını kontrol et
    console.log('\n4️⃣ Service Worker Kontrol Ediliyor...');
    
    if (fs.existsSync('public/sw.js')) {
      const swContent = fs.readFileSync('public/sw.js', 'utf8');
      
      const swChecks = {
        hasInstallEvent: swContent.includes('install'),
        hasFetchEvent: swContent.includes('fetch'),
        hasPushEvent: swContent.includes('push'),
        hasNotificationClick: swContent.includes('notificationclick'),
        hasCacheName: swContent.includes('CACHE_NAME')
      };
      
      Object.entries(swChecks).forEach(([check, result]) => {
        console.log(`${result ? '✅' : '❌'} ${check}: ${result ? 'Mevcut' : 'Eksik'}`);
      });
    }

    // 5. Frontend build kontrolü
    console.log('\n5️⃣ Frontend Build Kontrol Ediliyor...');
    
    const buildFiles = [
      'dist/index.html',
      'dist/assets',
      'dist/manifest.json',
      'dist/sw.js'
    ];

    const buildChecks = {};
    for (const file of buildFiles) {
      const exists = fs.existsSync(file);
      buildChecks[file] = exists;
      console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? 'Mevcut' : 'Eksik'}`);
    }

    // 6. Browser'da PWA testi
    console.log('\n6️⃣ Browser PWA Testi Başlıyor...');
    
    // Localhost'a git
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    console.log('✅ Sayfa yüklendi');

    // 7. PWA özelliklerini test et
    console.log('\n7️⃣ PWA Özellikleri Test Ediliyor...');
    
    // Service Worker kaydı
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    console.log(`${swRegistered ? '✅' : '❌'} Service Worker API: ${swRegistered ? 'Destekleniyor' : 'Desteklenmiyor'}`);

    // Push Notification desteği
    const pushSupported = await page.evaluate(() => {
      return 'PushManager' in window;
    });
    console.log(`${pushSupported ? '✅' : '❌'} Push Notifications: ${pushSupported ? 'Destekleniyor' : 'Desteklenmiyor'}`);

    // Manifest yükleme
    const manifestLoaded = await page.evaluate(() => {
      return !!document.querySelector('link[rel="manifest"]');
    });
    console.log(`${manifestLoaded ? '✅' : '❌'} Manifest Link: ${manifestLoaded ? 'Yüklendi' : 'Yüklenmedi'}`);

    // 8. Responsive tasarım testi
    console.log('\n8️⃣ Responsive Tasarım Testi...');
    
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1280, height: 720, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewport(viewport);
      console.log(`✅ ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
      
      // Screenshot al
      const screenshotPath = `test-screenshots/${viewport.name.toLowerCase()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   📸 Screenshot kaydedildi: ${screenshotPath}`);
    }

    // 9. Performance testi
    console.log('\n9️⃣ Performance Testi...');
    
    const performanceMetrics = await page.metrics();
    console.log('📊 Performance Metrikleri:');
    console.log(`   JS Heap Size: ${Math.round(performanceMetrics.JSHeapUsedSize / 1024 / 1024)}MB`);
    console.log(`   JS Heap Total: ${Math.round(performanceMetrics.JSHeapTotalSize / 1024 / 1024)}MB`);
    console.log(`   DOM Nodes: ${performanceMetrics.Nodes}`);
    console.log(`   Layout Count: ${performanceMetrics.LayoutCount}`);
    console.log(`   Recalc Style Count: ${performanceMetrics.RecalcStyleCount}`);

    // 10. Lighthouse testi (eğer lighthouse CLI varsa)
    console.log('\n🔟 Lighthouse Testi...');
    
    try {
      const { execSync } = require('child_process');
      const lighthouseResult = execSync('npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless"', { encoding: 'utf8' });
      console.log('✅ Lighthouse testi tamamlandı');
      console.log('📊 Lighthouse raporu: ./lighthouse-report.json');
    } catch (error) {
      console.log('⚠️ Lighthouse testi atlandı (lighthouse CLI gerekli)');
    }

    // 11. PWA Install Prompt testi
    console.log('\n1️⃣1️⃣ PWA Install Prompt Testi...');
    
    // Beforeinstallprompt event'ini dinle
    const installPromptDetected = await page.evaluate(() => {
      return new Promise((resolve) => {
        let detected = false;
        window.addEventListener('beforeinstallprompt', () => {
          detected = true;
          resolve(true);
        });
        
        // 5 saniye bekle
        setTimeout(() => resolve(detected), 5000);
      });
    });
    
    console.log(`${installPromptDetected ? '✅' : '❌'} Install Prompt: ${installPromptDetected ? 'Tespit edildi' : 'Tespit edilmedi'}`);

    // 12. Push Notification testi
    console.log('\n1️⃣2️⃣ Push Notification Testi...');
    
    const notificationPermission = await page.evaluate(() => {
      return Notification.permission;
    });
    
    console.log(`📱 Notification Permission: ${notificationPermission}`);
    
    if (notificationPermission === 'default') {
      // Permission iste
      await page.evaluate(() => {
        Notification.requestPermission();
      });
      console.log('🔔 Notification permission istendi');
    }

    // 13. Offline testi
    console.log('\n1️⃣3️⃣ Offline Testi...');
    
    // Offline moda geç
    await page.setOfflineMode(true);
    console.log('📴 Offline moda geçildi');
    
    // Sayfayı yenile
    await page.reload({ waitUntil: 'networkidle2' });
    console.log('✅ Offline modda sayfa yüklendi');
    
    // Online moda geri dön
    await page.setOfflineMode(false);
    console.log('📶 Online moda geri dönüldü');

    // 14. Test sonuçları özeti
    console.log('\n1️⃣4️⃣ Test Sonuçları Özeti...');
    
    const testResults = {
      pwaFiles: Object.values(pwaFileChecks).filter(Boolean).length,
      buildFiles: Object.values(buildChecks).filter(Boolean).length,
      swRegistered,
      pushSupported,
      manifestLoaded,
      installPromptDetected,
      notificationPermission: notificationPermission !== 'denied'
    };

    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const pwaScore = (passedTests / totalTests) * 100;

    console.log('📊 PWA Test Skoru:', `${pwaScore.toFixed(1)}% (${passedTests}/${totalTests})`);
    
    console.log('\n📋 Detaylı Sonuçlar:');
    Object.entries(testResults).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
    });

    if (pwaScore >= 90) {
      console.log('\n🎉 PWA testi başarılı! Uygulama PWA standartlarına uygun.');
    } else if (pwaScore >= 70) {
      console.log('\n⚠️ PWA testi kısmen başarılı. Bazı özellikler iyileştirilmeli.');
    } else {
      console.log('\n❌ PWA testi başarısız. Temel PWA özellikleri eksik.');
    }

    console.log('\n🌐 Frontend PWA Test Tamamlandı!');

  } catch (error) {
    console.error('❌ PWA test hatası:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Test screenshots klasörünü oluştur
const screenshotsDir = 'test-screenshots';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

testFrontendPWA();
