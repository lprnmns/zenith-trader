## Zenith Trader – Suggested Wallets Motoru: Durum Raporu

### Ne yapıldı? (Kod ve Yapı)
- Veritabanı şeması güncellendi (`prisma/schema.prisma`):
  - `WatchedWallet { id, address(unique), description? }`
  - `SuggestedWallet { id, address(unique), name, riskLevel, oneMonthPnlPercent, winRatePercent, consistencyScore, smartScore, lastAnalyzedAt, createdAt, updatedAt }` (gerekli alanlara varsayılanlar eklendi)
- Seed script güncellendi (`prisma/seed.js`):
  - `WatchedWallet` için tohum adresler (en az 10+; demo olarak `0xc82b2e...5581` dahil)
- Worker eklendi (`src/workers/suggestionEngine.js`):
  - Her cüzdan için `analyzeWallet(address)` çağırır, 30 gün filtreli metrikleri hesaplar
  - Metrikler: `oneMonthPnlPercent`, `winRatePercent`, `consistencyScore` (cumulative PnL std sapma tabanlı, 0–100 normalize), `smartScore = 0.4*1M + 0.3*win + 0.3*consistency`
  - Sonuçları `SuggestedWallet` tablosuna upsert eder
- API güncellendi (`src/api/routes.js`):
  - `GET /api/explorer/suggested-wallets` artık DB’den `smartScore` desc sıralı döner
- Sunucu entegrasyonu (`server.js`):
  - Worker başlangıçta bir kez ve sonrasında her 24 saatte bir çalışacak şekilde planlandı
- Frontend (`frontend/project/src/pages/ExplorerPage.tsx`):
  - Suggested Wallets listeleme, yeni alanlarla eşleştirildi (smartScore, oneMonthPnlPercent, winRatePercent, riskLevel)
  - Üstteki “Sort by” menüsü: Smart Score / 1M PnL% / Win rate% (frontend sıralama)

### Çalıştırma adımları (denenenler)
1) `.env` yeniden oluşturuldu (Docker ve Prisma uyumlu)
2) Postgres konteyneri başlatıldı ve yeniden başlatıldı:
   - `docker-compose up -d db; docker-compose restart db`
3) Prisma migrate denendi:
   - `npx prisma migrate dev --name add_suggestion_engine --schema ./prisma/schema.prisma --skip-generate`
   - Alternatif: `--create-only` da denendi

### Alınan hata (şu anki blokaj)
```
Error: P1002 – The database server was reached but timed out.
Context: Timed out trying to acquire a postgres advisory lock (SELECT pg_advisory_lock(72707369)). Timeout: 10000ms
```

### Olası nedenler
- PostgreSQL üzerinde Prisma’nın kullandığı advisory lock (72707369) başka bir oturum tarafından tutuluyor
  - Eşzamanlı/yarım kalmış bir `prisma migrate dev` işlemi
  - Uzun süredir açık bir bağlantı/oturum (ör. başka bir süreç)
  - Backend/başka araçlar DB’ye bağlı olsa da normalde advisory lock sadece migrate tarafında tutulur; muhtemel sebep önceki migrate’nin asılı kalması

### Önerilen düzeltme adımları
1) Node backend’i kapat (tüm `node` süreçleri dursun) ve tekrar dene
   - Windows/PowerShell: `Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force`
2) DB’de advisory lock tutan oturumları sonlandır
   - Oturumları listele:
     - `docker exec -it zenith-trader-db-1 psql -U zenith -d zenith_trader_db -c "SELECT pid, usename, state, query, backend_start FROM pg_stat_activity WHERE datname='zenith_trader_db';"`
   - Advisory lock’ları serbest bırak (ikisi de güvenli):
     - `docker exec -it zenith-trader-db-1 psql -U zenith -d zenith_trader_db -c "SELECT pg_advisory_unlock_all();"`
     - veya kilitli oturumu sonlandır:
       `docker exec -it zenith-trader-db-1 psql -U zenith -d zenith_trader_db -c "SELECT pg_terminate_backend(pid) FROM pg_locks l JOIN pg_stat_activity a USING (pid) WHERE locktype='advisory';"`
3) Zaman aşımını geçici olarak yükselterek migrate çalıştır (gerekirse):
   - `set PRISMA_MIGRATION_ENGINE_ADVISORY_LOCK_TIMEOUT=60000` (Windows) veya
   - PowerShell: `$env:PRISMA_MIGRATION_ENGINE_ADVISORY_LOCK_TIMEOUT=60000`
   - Ardından: `npx prisma migrate dev --name add_suggestion_engine --schema ./prisma/schema.prisma --skip-generate`
4) Migration başarılı olunca:
   - `npm run seed` (WatchedWallet doldurma)
   - Backend yeniden başlat; worker ilk koşuyu yapsın
   - `GET /api/explorer/suggested-wallets` ile doğrula

### Şu anki durumun özeti
- Kod tarafı (model, worker, API, server planlayıcı, frontend) tamamlandı.
- DB migration aşaması, PostgreSQL advisory lock (72707369) nedeniyle uygulanamıyor (P1002).
- .env dosyası düzeltilip Postgres tekrar başlatıldı; kilit halen devam ediyor.

### Karar / Beklenen talimat
- Yukarıdaki “Önerilen düzeltme adımları”ndan hangısını uygulayalım? (Öneri: 1→2→3 sırasıyla ilerleyelim, ardından migrate/seed ve doğrulama.)


