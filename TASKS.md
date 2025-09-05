# 📋 Zenith Trader - Görev Listesi & Implementasyon Planı

## 🎯 **Faz 1: Veritabanı & Backend Altyapısı**

### **1.1 Yeni Database Tabloları**
- [ ] `copy_trading_configs` tablosu oluştur
  - `id` (Primary Key)
  - `okx_api_key` (Encrypted)
  - `okx_secret_key` (Encrypted)
  - `okx_passphrase` (Encrypted)
  - `is_active` (Boolean)
  - `created_at`, `updated_at`

- [ ] `user_wallet_notifications` tablosu oluştur
  - `id` (Primary Key)
  - `user_id` (Foreign Key)
  - `wallet_address` (String)
  - `is_active` (Boolean)
  - `created_at`, `updated_at`

- [ ] `position_signals` tablosu oluştur
  - `id` (Primary Key)
  - `wallet_address` (String)
  - `signal_type` (BUY/SELL)
  - `token` (String)
  - `amount` (Decimal)
  - `percentage` (Decimal)
  - `price` (Decimal)
  - `timestamp` (DateTime)
  - `processed` (Boolean)

- [ ] `copy_trades` tablosu oluştur
  - `id` (Primary Key)
  - `signal_id` (Foreign Key)
  - `okx_order_id` (String)
  - `status` (String)
  - `executed_at` (DateTime)

### **1.2 Prisma Schema Güncellemeleri**
- [ ] `prisma/schema.prisma` dosyasını güncelle
- [ ] Migration dosyalarını oluştur
- [ ] Database'i migrate et

---

## 🔧 **Faz 2: Copy Trading Sistemi**

### **2.1 OKX Service Entegrasyonu**
- [ ] `test_real_signals.js` mantığını `src/services/copyTradingService.js`'e taşı
- [ ] Token mapping sistemini implement et
- [ ] Lot size hesaplama fonksiyonlarını ekle
- [ ] Enstrüman bilgilerini cache'leme sistemi

### **2.2 Copy Trading Engine**
- [ ] `src/core/copyTradingEngine.js` oluştur
- [ ] Position Ledger analiz mantığını entegre et
- [ ] Sinyal tespit algoritmasını implement et
- [ ] OKX emir gönderme sistemi

### **2.3 Admin API Endpoints**
- [ ] `POST /api/admin/copy-trading/config` - OKX ayarlarını kaydet
- [ ] `GET /api/admin/copy-trading/status` - Durum bilgisi
- [ ] `POST /api/admin/copy-trading/start` - Copy trading başlat
- [ ] `POST /api/admin/copy-trading/stop` - Copy trading durdur
- [ ] `GET /api/admin/copy-trading/history` - İşlem geçmişi

---

## 🔔 **Faz 3: Bildirim Sistemi**

### **3.1 Bildirim Service**
- [ ] `src/services/notificationService.js` oluştur
- [ ] Position Ledger tabanlı bildirim mantığı
- [ ] Kullanıcı bildirim tercihleri yönetimi
- [ ] PWA push notification sistemi

### **3.2 Bildirim API Endpoints**
- [ ] `POST /api/notifications/subscribe` - Bildirim aboneliği
- [ ] `DELETE /api/notifications/unsubscribe` - Bildirim aboneliğini iptal
- [ ] `GET /api/notifications/history` - Bildirim geçmişi
- [ ] `POST /api/notifications/test` - Test bildirimi

### **3.3 Background Job Sistemi**
- [ ] `src/jobs/walletScanner.js` oluştur
- [ ] 1 dakika aralıklarla tarama sistemi
- [ ] Yeni pozisyon tespit algoritması
- [ ] Bildirim gönderme sistemi

---

## 🎨 **Faz 4: Frontend Güncellemeleri**

### **4.1 Admin Paneli**
- [ ] Strateji sayfasına OKX ayarları bölümü ekle
- [ ] Copy trading durum göstergesi
- [ ] Aktif cüzdan listesi
- [ ] İşlem geçmişi tablosu

### **4.2 Kullanıcı Paneli**
- [ ] Wallet analiz sayfasına "Bildirimleri Aç" butonu ekle
- [ ] Bildirim tercihleri sayfası oluştur
- [ ] Bildirim geçmişi sayfası
- [ ] PWA kurulum rehberi

### **4.3 PWA Güncellemeleri**
- [ ] Service Worker'ı güncelle
- [ ] Push notification handling
- [ ] Offline çalışma optimizasyonu
- [ ] App manifest güncellemeleri

---

## 🔄 **Faz 5: Entegrasyon & Test**

### **5.1 Sistem Entegrasyonu**
- [ ] Copy trading engine'i ana sisteme entegre et
- [ ] Bildirim sistemini background job'a bağla
- [ ] Error handling ve logging sistemi
- [ ] Rate limiting ve API koruması

### **5.2 Test Sistemi**
- [ ] Copy trading test scripti
- [ ] Bildirim test sistemi
- [ ] PWA test ortamı
- [ ] End-to-end test senaryoları

### **5.3 Güvenlik & Performans**
- [ ] API key şifreleme
- [ ] Input validation
- [ ] Database indexing
- [ ] Cache sistemi (opsiyonel)

---

## 🚀 **Faz 6: Deployment & Monitoring**

### **6.1 Production Hazırlığı**
- [ ] Environment variables ayarları
- [ ] Production database migration
- [ ] SSL sertifikası
- [ ] Domain ayarları

### **6.2 Monitoring & Logging**
- [ ] Error tracking sistemi
- [ ] Performance monitoring
- [ ] API usage analytics
- [ ] User activity tracking

---

## 📅 **Tahmini Zaman Çizelgesi**

| Faz | Süre | Öncelik |
|-----|------|---------|
| Faz 1 | 2-3 gün | 🔴 Yüksek |
| Faz 2 | 4-5 gün | 🔴 Yüksek |
| Faz 3 | 3-4 gün | 🟡 Orta |
| Faz 4 | 3-4 gün | 🟡 Orta |
| Faz 5 | 2-3 gün | 🟢 Düşük |
| Faz 6 | 1-2 gün | 🟢 Düşük |

**Toplam: 15-21 gün**

---

## 🎯 **Öncelik Sırası**

1. **🔴 Kritik**: Database tabloları ve copy trading engine
2. **🟡 Önemli**: Bildirim sistemi ve frontend güncellemeleri
3. **🟢 Düşük**: Test, monitoring ve deployment

---

## 📝 **Notlar**

- `test_real_signals.js` mantığı tamamen korunacak
- Mevcut wallet analytics sistemi değişmeyecek
- PWA özellikleri mevcut yapıya entegre edilecek
- Admin paneli minimal değişiklik alacak
- Güvenlik öncelikli olacak
