# 🚀 Zenith Trader - Copy Trading & Wallet Analytics Platform

## 📊 **Sistem Genel Bakış**

Zenith Trader, blockchain cüzdanlarını analiz eden ve master trader'ların işlemlerini otomatik olarak kopyalayan gelişmiş bir platformdur. Hem web hem de PWA (Progressive Web App) olarak çalışır.

---

## 👥 **Kullanıcı Rolleri**

### 🔧 **Admin (Platform Sahibi)**
- **Strateji Yönetimi**: OKX API bilgilerini girme ve copy trading'i aktifleştirme
- **Sistem Yönetimi**: Tüm kullanıcıları ve işlemleri görüntüleme
- **Copy Trading**: Seçilen cüzdanların işlemlerini otomatik kopyalama

### 👤 **Normal Kullanıcılar**
- **Wallet Explorer**: Blockchain cüzdanlarını analiz etme
- **Bildirim Sistemi**: İlgi duydukları cüzdanların hareketlerini takip etme
- **PWA Kullanımı**: Mobil cihazlarda bildirim alma

---

## 🎯 **Ana Özellikler**

### 1. **Wallet Analytics (Mevcut)**
- ✅ Zerion API entegrasyonu
- ✅ Etherscan API entegrasyonu
- ✅ Position Ledger analizi
- ✅ PnL hesaplamaları (1d, 7d, 30d)
- ✅ Token fiyat takibi (Coingecko fallback)

### 2. **Copy Trading Sistemi (YENİ)**
- ✅ OKX Futures API entegrasyonu
- ✅ Otomatik kaldıraç ayarlama (LONG: 3x, SHORT: 1x)
- ✅ Token mapping sistemi (WBTC→BTC, WETH→ETH)
- ✅ Lot size'a göre otomatik yuvarlama
- ✅ Minimum emir miktarı kontrolü
- ✅ Real-time pozisyon takibi

### 3. **Bildirim Sistemi (YENİ)**
- ✅ Position Ledger tabanlı bildirimler
- ✅ Yeni pozisyon açma bildirimleri
- ✅ Pozisyon kapatma bildirimleri
- ✅ Kısmi satış bildirimleri
- ✅ PWA push notifications
- ✅ 1 dakika aralıklarla tarama

---

## 🔄 **İş Akışları**

### **Admin Copy Trading Akışı:**
1. Admin giriş yapar
2. Strateji sayfasından OKX API bilgilerini girer
3. Copy trading aktifleştirilir
4. Seçilen cüzdanlar 1 dakika aralıklarla taranır
5. Yeni pozisyonlar otomatik kopyalanır

### **Kullanıcı Bildirim Akışı:**
1. Kullanıcı wallet explorer'dan cüzdan analiz eder
2. "Bildirimleri Aç" butonuna tıklar
3. Database'e kayıt yapılır
4. 1 dakika aralıklarla cüzdan taranır
5. Yeni hareketler bildirim olarak gönderilir

---

## 📱 **PWA Özellikleri**
- ✅ Service Worker ile offline çalışma
- ✅ Push notification desteği
- ✅ App-like deneyim
- ✅ Mobil optimizasyon
- ✅ VAPID key entegrasyonu

---

## 🗄️ **Veritabanı Yapısı**

### **Yeni Tablolar:**
- `copy_trading_configs` - Admin OKX ayarları
- `user_wallet_notifications` - Kullanıcı bildirim tercihleri
- `position_signals` - Tespit edilen pozisyon sinyalleri
- `copy_trades` - Yapılan copy trade'ler

---

## 🔧 **Teknik Detaylar**

### **Copy Trading Algoritması:**
```javascript
// test_real_signals.js'ten alınan mantık
1. Enstrüman bilgilerini API'den çek
2. ctVal, lotSize, minSz değerlerini al
3. Pozisyon büyüklüğünü hesapla
4. Lot size'a göre yuvarla
5. Minimum emir kontrolü yap
6. OKX'e emir gönder
```

### **Bildirim Algoritması:**
```javascript
1. Position Ledger'ı analiz et
2. Yeni BUY/SELL hareketlerini tespit et
3. Pozisyon yüzdesini hesapla
4. Bildirim mesajını oluştur
5. İlgili kullanıcılara gönder
```

---

## 🎨 **UI/UX Özellikleri**

### **Admin Paneli:**
- Mevcut strateji sayfası (değişiklik yok)
- Copy trading durumu göstergesi
- Aktif cüzdan listesi
- İşlem geçmişi

### **Kullanıcı Paneli:**
- Wallet Explorer (mevcut)
- Bildirim tercihleri sayfası
- Bildirim geçmişi
- PWA kurulum rehberi

---

## 🔒 **Güvenlik**
- ✅ API key'ler şifrelenmiş saklanır
- ✅ Demo trading öncelikli
- ✅ Rate limiting
- ✅ Input validation
- ✅ CORS koruması

---

## 📈 **Performans**
- ✅ 1 dakika aralıklarla tarama
- ✅ Batch processing
- ✅ Redis cache (opsiyonel)
- ✅ Database indexing
- ✅ API rate limit yönetimi
