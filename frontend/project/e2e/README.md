# E2E Test Documentation

## Kurulum

E2E testleri için Playwright kullanılmaktadır.

### Browser Binary'leri Kurulumu
```bash
npx playwright install
```

### Test Çalıştırma

#### Tüm Testleri Çalıştır
```bash
npm run test:e2e
```

#### Headed Modda Çalıştır (Görsel olarak izlemek için)
```bash
npm run test:e2e:headed
```

#### UI Modda Çalıştır (Testleri görsel olarak yönetmek için)
```bash
npm run test:e2e:ui
```

#### Spesifik Test Dosyasını Çalıştır
```bash
npx playwright test e2e/basic-app.spec.ts
```

#### Spesifik Testi Çalıştır
```bash
npx playwright test e2e/basic-app.spec.ts --grep "should load application successfully"
```

## Test Yapısı

### Test Dosyaları
- `e2e/auth.spec.ts` - Authentication testleri (karmaşık senaryolar)
- `e2e/strategy-wizard.spec.ts` - Strategy creation wizard testleri
- `e2e/basic-app.spec.ts` - Temel uygulama testleri

### Test Kategorileri

1. **Basic Application Tests**
   - Uygulama yükleme
   - Form elementleri
   - Validasyon mesajları
   - Responsive design

2. **Authentication Tests**
   - Login form işlevselliği
   - Validasyon kontrolü
   - Google OAuth entegrasyonu

3. **Navigation Tests**
   - Sayfa geçişleri
   - Rota yönetimi

4. **Performance Tests**
   - Yükleme süreleri
   - Render performansı

5. **Accessibility Tests**
   - Form erişilebilirliği
   - Link ve buton durumu

## Test Konfigürasyonu

### Playwright Config (`playwright.config.ts`)
- **Test Dizini**: `./e2e`
- **Base URL**: `http://localhost:5173`
- **Browser'lar**: Chromium, Firefox, Webkit
- **Mobile Testleri**: Pixel 5, iPhone 12
- **Timeout**: Varsayılan 30 saniye

### Web Server
Testler çalışırken development server otomatik başlatılır:
- **Komut**: `npm run dev`
- **URL**: `http://localhost:5173`
- **Timeout**: 120 saniye

## Test Sonuçları

Test sonuçları `test-results` dizininde saklanır:
- **HTML Report**: `test-results/index.html`
- **Screenshots**: Test hatalarında otomatik çekilir
- **Videos**: Test hatalarında kaydedilir
- **Trace**: Hata ayıklama için detaylı trace bilgileri

## Hata Ayıklama

### Test Debug Etme
```bash
npx playwright test --debug
```

### Trace Viewer
```bash
npx playwright show-trace test-results/trace.zip
```

### HTML Report
```bash
npx playwright show-report
```

## Test Senaryoları

### Başarılı Senaryolar
- ✅ Uygulama yüklenmesi
- ✅ Form elementlerinin görünürlüğü
- ✅ Input alanlarının işlevselliği
- ✅ Responsive design testleri
- ✅ Link navigasyonu

### Bilinen Sorunlar
- ❌ Google OAuth butonu (bazı durumlarda yüklenmiyor)
- ❌ Form submit sonrası redirect (login sayfasında kalıyor)
- ❌ Validation mesajları (bazen timeout oluyor)

## İyileştirme Önerileri

1. **Test Stabilizasyonu**
   - Wait/timeout süreleri optimize edilmeli
   - Selector'lar daha spesifik hale getirilmeli
   - Mock data kullanımı artırılmalı

2. **Kapsam Alanı Genişletme**
   - Dashboard testleri eklenmeli
   - Strategy management testleri tamamlanmalı
   - Error handling testleri geliştirilmeli

3. **Performans**
   - Paralel test çalıştırma optimize edilmeli
   - Test süreleri kısaltılmalı
   - CI/CD entegrasyonu sağlanmalı

## Best Practices

1. **Selector Kullanımı**
   - `data-testid` attribute'ı kullanılmalı
   - CSS selector'lar yerine Playwright locator'ları tercih edilmeli
   - Dynamic selector'lardan kaçınılmalı

2. **Test Yapısı**
   - Her test bağımsız olmalı
   - `beforeEach` ve `afterEach` kullanılmalı
   - Testler deterministik olmalı

3. **Hata Yönetimi**
   - `waitFor` yerine `waitForSelector` kullanılmalı
   - Timeout değerleri合理 ayarlanmalı
   - Retry mekanizması kullanılmalı