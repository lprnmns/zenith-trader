const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function buildFrontend() {
  console.log('🏗️ Frontend Build Başlıyor...\n');

  try {
    // 1. Frontend klasörü kontrolü
    console.log('1️⃣ Frontend klasörü kontrol ediliyor...');
    
    if (!fs.existsSync('frontend')) {
      console.log('❌ Frontend klasörü bulunamadı');
      console.log('📝 Frontend React uygulaması oluşturuluyor...');
      
      // React uygulaması oluştur
      execSync('npx create-react-app frontend --template typescript', { stdio: 'inherit' });
      console.log('✅ React uygulaması oluşturuldu');
    } else {
      console.log('✅ Frontend klasörü mevcut');
    }

    // 2. Frontend klasörüne geç
    process.chdir('frontend');
    console.log('\n2️⃣ Frontend klasörüne geçildi');

    // 3. Dependencies kontrolü
    console.log('\n3️⃣ Dependencies kontrol ediliyor...');
    
    if (!fs.existsSync('package.json')) {
      console.log('❌ package.json bulunamadı');
      return;
    }

    // 4. Dependencies yükle
    console.log('\n4️⃣ Dependencies yükleniyor...');
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dependencies yüklendi');
    } catch (error) {
      console.log('⚠️ Dependencies yükleme hatası, devam ediliyor...');
    }

    // 5. PWA dependencies ekle
    console.log('\n5️⃣ PWA dependencies ekleniyor...');
    
    const pwaDependencies = [
      'workbox-webpack-plugin',
      'web-push'
    ];

    for (const dep of pwaDependencies) {
      try {
        execSync(`npm install ${dep} --save`, { stdio: 'inherit' });
        console.log(`✅ ${dep} eklendi`);
      } catch (error) {
        console.log(`⚠️ ${dep} eklenemedi, devam ediliyor...`);
      }
    }

    // 6. PWA dosyalarını kopyala
    console.log('\n6️⃣ PWA dosyaları kopyalanıyor...');
    
    const pwaFiles = [
      '../public/manifest.json',
      '../public/sw.js',
      '../public/icon-192x192.svg',
      '../public/icon-512x512.svg'
    ];

    for (const file of pwaFiles) {
      if (fs.existsSync(file)) {
        const fileName = path.basename(file);
        const destPath = path.join('public', fileName);
        fs.copyFileSync(file, destPath);
        console.log(`✅ ${fileName} kopyalandı`);
      } else {
        console.log(`⚠️ ${file} bulunamadı`);
      }
    }

    // 7. index.html'i güncelle
    console.log('\n7️⃣ index.html güncelleniyor...');
    
    const indexPath = path.join('public', 'index.html');
    if (fs.existsSync(indexPath)) {
      let htmlContent = fs.readFileSync(indexPath, 'utf8');
      
      // Manifest link ekle
      if (!htmlContent.includes('manifest.json')) {
        htmlContent = htmlContent.replace(
          '<head>',
          '<head>\n  <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />'
        );
      }
      
      // Service Worker script ekle
      if (!htmlContent.includes('sw.js')) {
        htmlContent = htmlContent.replace(
          '</body>',
          '  <script>\n    if ("serviceWorker" in navigator) {\n      window.addEventListener("load", () => {\n        navigator.serviceWorker.register("/sw.js");\n      });\n    }\n  </script>\n</body>'
        );
      }
      
      fs.writeFileSync(indexPath, htmlContent);
      console.log('✅ index.html güncellendi');
    }

    // 8. Build işlemi
    console.log('\n8️⃣ Build işlemi başlatılıyor...');
    
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ Build işlemi tamamlandı');
    } catch (error) {
      console.log('❌ Build işlemi başarısız');
      console.log('📝 Development modunda devam ediliyor...');
      
      // Development server başlat
      console.log('\n9️⃣ Development server başlatılıyor...');
      execSync('npm start', { stdio: 'inherit' });
    }

    // 9. Build sonuçlarını kontrol et
    console.log('\n9️⃣ Build sonuçları kontrol ediliyor...');
    
    const buildDir = 'build';
    if (fs.existsSync(buildDir)) {
      const buildFiles = fs.readdirSync(buildDir);
      console.log('📁 Build dosyaları:');
      buildFiles.forEach(file => {
        console.log(`   📄 ${file}`);
      });
    }

    // 10. Ana klasöre geri dön
    process.chdir('..');
    console.log('\n🔙 Ana klasöre geri dönüldü');

    console.log('\n🎉 Frontend build işlemi tamamlandı!');
    console.log('📝 Not: Eğer build başarısız olursa, development server çalışıyor olabilir.');

  } catch (error) {
    console.error('❌ Frontend build hatası:', error.message);
    console.error('Stack:', error.stack);
  }
}

buildFrontend();
