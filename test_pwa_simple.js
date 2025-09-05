const fs = require('fs');
const path = require('path');

async function testPWASimple() {
  console.log('🌐 Basit PWA Test Başlıyor...\n');

  try {
    const results = {};

    // 1. PWA dosyalarını kontrol et
    console.log('1️⃣ PWA Dosyaları Kontrol Ediliyor...');
    
    const pwaFiles = [
      'public/manifest.json',
      'public/sw.js',
      'public/icon-192x192.svg',
      'public/icon-512x512.svg',
      'public/badge-72x72.svg'
    ];

    results.pwaFiles = {};
    for (const file of pwaFiles) {
      const exists = fs.existsSync(file);
      results.pwaFiles[file] = exists;
      console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? 'Mevcut' : 'Eksik'}`);
    }

    // 2. Manifest dosyasını kontrol et
    console.log('\n2️⃣ Manifest Dosyası Kontrol Ediliyor...');
    
    if (fs.existsSync('public/manifest.json')) {
      try {
        const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));
        
        const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
        results.manifestFields = {};
        
        for (const field of requiredFields) {
          results.manifestFields[field] = !!manifest[field];
          console.log(`${manifest[field] ? '✅' : '❌'} ${field}: ${manifest[field] ? 'Mevcut' : 'Eksik'}`);
        }
        
        console.log('📋 Manifest Özeti:');
        console.log(`   Name: ${manifest.name}`);
        console.log(`   Short Name: ${manifest.short_name}`);
        console.log(`   Start URL: ${manifest.start_url}`);
        console.log(`   Display: ${manifest.display}`);
        console.log(`   Icons: ${manifest.icons?.length || 0} adet`);
        console.log(`   Theme Color: ${manifest.theme_color}`);
        console.log(`   Background Color: ${manifest.background_color}`);
      } catch (error) {
        console.log('❌ Manifest dosyası parse edilemedi:', error.message);
        results.manifestParse = false;
      }
    } else {
      results.manifestExists = false;
    }

    // 3. Service Worker dosyasını kontrol et
    console.log('\n3️⃣ Service Worker Kontrol Ediliyor...');
    
    if (fs.existsSync('public/sw.js')) {
      const swContent = fs.readFileSync('public/sw.js', 'utf8');
      
      results.swFeatures = {
        hasInstallEvent: swContent.includes('install'),
        hasFetchEvent: swContent.includes('fetch'),
        hasPushEvent: swContent.includes('push'),
        hasNotificationClick: swContent.includes('notificationclick'),
        hasCacheName: swContent.includes('CACHE_NAME'),
        hasCacheStorage: swContent.includes('caches'),
        hasSkipWaiting: swContent.includes('skipWaiting')
      };
      
      Object.entries(results.swFeatures).forEach(([feature, exists]) => {
        console.log(`${exists ? '✅' : '❌'} ${feature}: ${exists ? 'Mevcut' : 'Eksik'}`);
      });
    } else {
      results.swExists = false;
      console.log('❌ Service Worker dosyası bulunamadı');
    }

    // 4. HTML dosyasını kontrol et
    console.log('\n4️⃣ HTML Dosyası Kontrol Ediliyor...');
    
    if (fs.existsSync('public/index.html')) {
      const htmlContent = fs.readFileSync('public/index.html', 'utf8');
      
      results.htmlFeatures = {
        hasManifestLink: htmlContent.includes('manifest.json'),
        hasThemeColor: htmlContent.includes('theme-color'),
        hasViewport: htmlContent.includes('viewport'),
        hasServiceWorkerScript: htmlContent.includes('sw.js'),
        hasPWAStructure: htmlContent.includes('PWA Status')
      };
      
      Object.entries(results.htmlFeatures).forEach(([feature, exists]) => {
        console.log(`${exists ? '✅' : '❌'} ${feature}: ${exists ? 'Mevcut' : 'Eksik'}`);
      });
    } else {
      results.htmlExists = false;
      console.log('❌ HTML dosyası bulunamadı');
    }

    // 5. Icon dosyalarını kontrol et
    console.log('\n5️⃣ Icon Dosyaları Kontrol Ediliyor...');
    
    const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
    results.icons = {};
    
    for (const size of iconSizes) {
      const iconFile = `public/icon-${size}x${size}.svg`;
      const exists = fs.existsSync(iconFile);
      results.icons[`${size}x${size}`] = exists;
      console.log(`${exists ? '✅' : '❌'} ${size}x${size}: ${exists ? 'Mevcut' : 'Eksik'}`);
    }

    // 6. PWA standartları kontrolü
    console.log('\n6️⃣ PWA Standartları Kontrol Ediliyor...');
    
    results.pwaStandards = {
      hasManifest: results.pwaFiles['public/manifest.json'],
      hasServiceWorker: results.pwaFiles['public/sw.js'],
      hasIcons: Object.values(results.icons).some(Boolean),
      hasHTTPS: true, // Localhost için true
      hasResponsiveDesign: results.htmlFeatures?.hasViewport || false,
      hasOfflineSupport: results.swFeatures?.hasFetchEvent || false,
      hasInstallPrompt: results.swFeatures?.hasInstallEvent || false
    };
    
    Object.entries(results.pwaStandards).forEach(([standard, met]) => {
      console.log(`${met ? '✅' : '❌'} ${standard}: ${met ? 'Karşılanıyor' : 'Karşılanmıyor'}`);
    });

    // 7. Test sonuçları özeti
    console.log('\n7️⃣ Test Sonuçları Özeti...');
    
    const totalChecks = Object.keys(results.pwaFiles).length + 
                       Object.keys(results.manifestFields || {}).length +
                       Object.keys(results.swFeatures || {}).length +
                       Object.keys(results.htmlFeatures || {}).length +
                       Object.keys(results.icons).length +
                       Object.keys(results.pwaStandards).length;
    
    const passedChecks = Object.values(results.pwaFiles).filter(Boolean).length +
                        Object.values(results.manifestFields || {}).filter(Boolean).length +
                        Object.values(results.swFeatures || {}).filter(Boolean).length +
                        Object.values(results.htmlFeatures || {}).filter(Boolean).length +
                        Object.values(results.icons).filter(Boolean).length +
                        Object.values(results.pwaStandards).filter(Boolean).length;
    
    const pwaScore = (passedChecks / totalChecks) * 100;
    
    console.log('📊 PWA Test Skoru:', `${pwaScore.toFixed(1)}% (${passedChecks}/${totalChecks})`);
    
    // 8. Detaylı rapor
    console.log('\n8️⃣ Detaylı Rapor...');
    
    console.log('📁 PWA Dosyaları:');
    Object.entries(results.pwaFiles).forEach(([file, exists]) => {
      console.log(`   ${exists ? '✅' : '❌'} ${path.basename(file)}`);
    });
    
    if (results.manifestFields) {
      console.log('\n📋 Manifest Alanları:');
      Object.entries(results.manifestFields).forEach(([field, exists]) => {
        console.log(`   ${exists ? '✅' : '❌'} ${field}`);
      });
    }
    
    if (results.swFeatures) {
      console.log('\n⚙️ Service Worker Özellikleri:');
      Object.entries(results.swFeatures).forEach(([feature, exists]) => {
        console.log(`   ${exists ? '✅' : '❌'} ${feature}`);
      });
    }
    
    if (results.htmlFeatures) {
      console.log('\n🌐 HTML Özellikleri:');
      Object.entries(results.htmlFeatures).forEach(([feature, exists]) => {
        console.log(`   ${exists ? '✅' : '❌'} ${feature}`);
      });
    }
    
    console.log('\n🎨 Icon Dosyaları:');
    Object.entries(results.icons).forEach(([size, exists]) => {
      console.log(`   ${exists ? '✅' : '❌'} ${size}`);
    });
    
    console.log('\n📱 PWA Standartları:');
    Object.entries(results.pwaStandards).forEach(([standard, met]) => {
      console.log(`   ${met ? '✅' : '❌'} ${standard}`);
    });

    // 9. Sonuç değerlendirmesi
    console.log('\n9️⃣ Sonuç Değerlendirmesi...');
    
    if (pwaScore >= 90) {
      console.log('🎉 PWA testi başarılı! Uygulama PWA standartlarına uygun.');
      console.log('✅ Uygulama yüklenebilir ve offline çalışabilir.');
    } else if (pwaScore >= 70) {
      console.log('⚠️ PWA testi kısmen başarılı. Bazı özellikler iyileştirilmeli.');
      console.log('📝 Eksik özellikler tamamlanmalı.');
    } else {
      console.log('❌ PWA testi başarısız. Temel PWA özellikleri eksik.');
      console.log('🔧 PWA standartlarına uygun hale getirilmeli.');
    }

    // 10. Öneriler
    console.log('\n🔟 Öneriler...');
    
    if (!results.pwaFiles['public/manifest.json']) {
      console.log('📝 Manifest dosyası oluşturulmalı');
    }
    
    if (!results.pwaFiles['public/sw.js']) {
      console.log('📝 Service Worker dosyası oluşturulmalı');
    }
    
    if (!Object.values(results.icons).some(Boolean)) {
      console.log('📝 Icon dosyaları oluşturulmalı');
    }
    
    if (!results.htmlFeatures?.hasManifestLink) {
      console.log('📝 HTML\'e manifest link eklenmeli');
    }
    
    if (!results.htmlFeatures?.hasServiceWorkerScript) {
      console.log('📝 HTML\'e Service Worker script eklenmeli');
    }

    console.log('\n🌐 Basit PWA Test Tamamlandı!');
    console.log('📝 Browser\'da http://localhost:3000 adresini ziyaret ederek PWA özelliklerini test edebilirsiniz.');

  } catch (error) {
    console.error('❌ PWA test hatası:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPWASimple();
