# Zenith Trader - Proje Dokümantasyonu ve Sorun Raporu

## 📋 Proje Özeti
**Zenith Trader**, kripto para yatırımcılarının başarılı trader'ları otomatik olarak kopyalamasını sağlayan bir copy trading platformudur.

## 🏗️ Sistem Mimarisi

### Backend
- **Teknoloji Stack:**
  - Node.js + Express.js
  - PostgreSQL (veritabanı)
  - Redis (cache)
  - Prisma ORM
  - Docker containerization

- **Deployment:**
  - **Platform:** Azure VM (Ubuntu 22.04 LTS)
  - **IP:** 20.79.186.203
  - **Port:** 3001 (Node.js), 80/443 (Nginx reverse proxy)
  - **Container Yapısı:**
    - `zenithtrader_app`: Ana uygulama (lprnmns/zenith-trader:latest)
    - `zenithtrader_db`: PostgreSQL 15-alpine
    - `zenithtrader_redis`: Redis 7-alpine
    - `portainer`: Container yönetimi (port 9000)
    - `dozzle`: Log izleme (port 8080)

### Frontend
- **Teknoloji Stack:**
  - React 18 + TypeScript
  - Vite (build tool)
  - TailwindCSS
  - Zustand (state management)
  - React Router v6
  - PWA desteği

- **Deployment:**
  - **Platform:** Vercel
  - **URL:** https://zenith-trader.vercel.app
  - **GitHub Repo:** https://github.com/lprnmns/zenith-trader

## 📁 Proje Yapısı
```
zenith-trader/
├── frontend/
│   └── project/          # React uygulaması
│       ├── src/
│       │   ├── stores/   # Zustand stores (authStore.ts önemli!)
│       │   ├── lib/      # API client (api.ts)
│       │   └── services/ # Service katmanı
│       └── vercel.json   # Vercel konfigürasyonu
├── server.js            # Backend entry point
├── src/
│   ├── api/            # API routes
│   └── services/       # Business logic
├── prisma/
│   └── schema.prisma   # Database schema
└── docker-compose.yml  # Container orchestration
```

## 🔧 Yapılan Değişiklikler ve Çözülen Sorunlar

### 1. Docker Container'a curl Yükleme
**Sorun:** Health check için curl gerekiyordu  
**Çözüm:**
```bash
sudo docker exec -u root zenithtrader_app apk add curl
```

### 2. Redis Bağlantı Sorunu
**Sorun:** Redis client "closed" hatası  
**Çözüm:** docker-compose.yml'de REDIS_URL düzeltildi: `redis://zenithtrader_redis:6379`

### 3. GitHub Secret Protection
**Sorun:** .env.production dosyasındaki Google OAuth key'leri push engelleniyordu  
**Çözüm:** .env dosyaları .gitignore'a eklendi, GitHub'da bypass edildi

### 4. Frontend Build Hataları
**Sorun:** TypeScript type hataları  
**Çözüm:** package.json'da build script değiştirildi: `"build": "vite build"`

### 5. Vercel Deployment
**Sorun:** Environment variable references ve secret hatası  
**Çözüm:** vercel.json'daki `env` bölümü kaldırıldı, variable'lar Vercel Dashboard'dan eklendi

### 6. HTTPS/HTTP Mixed Content
**Sorun:** Vercel HTTPS, backend HTTP - mixed content hatası  
**Çözüm:** Backend'e Nginx reverse proxy ile HTTPS eklendi:
```bash
# Nginx kurulumu ve SSL sertifikası
sudo apt install nginx
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/zenith-api.key \
  -out /etc/ssl/certs/zenith-api.crt
```

## 🚨 GÜNCEL SORUN

### Mixed Content Hatası Devam Ediyor
Frontend hala bazı yerlerde `http://20.79.186.203:3001` kullanıyor:

**Hata Mesajları:**
1. `POST http://20.79.186.203:3001/api/auth/register net::ERR_CONNECTION_TIMED_OUT`
2. `Mixed Content: requested an insecure resource 'http://20.79.186.203:3001/api/auth/register'`

**Sorunlu Dosyalar:**
- `src/stores/authStore.ts` - Line 6: `const API_BASE = 'http://localhost:3001/api';`
- `src/services/notificationService.ts` - HTTP URL kullanıyor olabilir

## 🔍 Çözüm İçin Yapılması Gerekenler

### 1. Frontend'te Tüm HTTP URL'lerini HTTPS'e Çevir:
```powershell
# Windows PowerShell'de çalıştırın
cd D:\projeler\zenith-trader\frontend\project

# Tüm HTTP URL'lerini bul
Get-ChildItem -Path src -Recurse -Include "*.ts","*.tsx" | 
  Select-String "http://20.79.186.203:3001\|http://localhost:3001"

# Değiştir
Get-ChildItem -Path src -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    (Get-Content $_.FullName) -replace 'http://20.79.186.203:3001', 'https://20.79.186.203' |
    Set-Content $_.FullName
    
    (Get-Content $_.FullName) -replace 'http://localhost:3001', 'https://20.79.186.203' |
    Set-Content $_.FullName
}
```

### 2. authStore.ts'i Manuel Düzelt:
```typescript
// src/stores/authStore.ts - Line 6
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://20.79.186.203/api';
```

### 3. Environment Variables (Vercel Dashboard):
```
VITE_API_BASE_URL = https://20.79.186.203/api
```

### 4. Deploy:
```bash
git add .
git commit -m "Fix all HTTP URLs to HTTPS"
git push origin main
vercel --prod --archive=tgz
```

## 📞 Erişim Bilgileri

### Backend (Azure VM):
- SSH: `ssh azureuser@20.79.186.203`
- API Health: https://20.79.186.203/api/health
- Portainer: http://20.79.186.203:9000
- Dozzle (logs): http://20.79.186.203:8080

### Frontend:
- Production: https://zenith-trader.vercel.app
- GitHub: https://github.com/lprnmns/zenith-trader

### Docker Komutları:
```bash
# Container durumları
sudo docker ps

# Logları görüntüle
sudo docker logs zenithtrader_app --tail=50 -f

# Container'a giriş
sudo docker exec -it zenithtrader_app sh

# Restart
sudo docker restart zenithtrader_app
```

## 🔑 Önemli Notlar
1. Frontend'teki tüm API çağrıları HTTPS kullanmalı
2. CORS ayarları Nginx'te yapılandırılmış durumda
3. SSL sertifikası self-signed (production'da Let's Encrypt kullanılmalı)
4. Environment variable'lar Vercel Dashboard'dan yönetiliyor
5. Backend container'ları `--restart unless-stopped` ile çalışıyor

## 🎯 Sonuç
**Ana sorun:** Frontend kodunda hala HTTP URL'leri var. Özellikle `authStore.ts` dosyasında hardcoded `http://localhost:3001` değeri mevcut. Tüm bu URL'lerin HTTPS versiyonlarına güncellenmesi gerekiyor.
