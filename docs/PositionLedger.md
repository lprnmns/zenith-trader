## Position Ledger — Teknik Tasarım ve Çalışma Mantığı

### Amaç
- Bir cüzdanın saf trade geçmişini pozisyon bazında (ALIŞ lotları) modellemek.
- SATIŞ işlemlerini FIFO ile lotlara eşleştirip gerçekleşmiş kâr/zararı (realized PnL) hesaplamak.
- Açık/kısmi açık lotlar için anlık fiyatlardan gerçekleşmemiş kâr/zararı (unrealized PnL) hesaplamak.
- Zaman içinde biriken kâr/zararı veren birikimli PnL (cumulative) serisini ve özet metrikleri üretmek.

---

## Mimari Yerleşim
- Backend endpoint: `GET /api/explorer/:address/analysis` in `src/api/routes.js`
- Analiz motoru: `src/services/analysisService.js` → `analyzeWallet(address)`
- Zerion istemcisi: `src/services/zerionService.js`
  - İşlem/transfer toplama: `getWalletTradesPage`, `getWalletTrades`, `getWalletTradeTransfers`
  - Fiyat alma: `getPricesForSymbols`, `getPricesByIds`, fallback: `getPricesFromCoingecko`

---

## Yüksek Seviyeli Akış
1) Frontend, `Explorer` sayfasından cüzdan adresiyle `GET /api/explorer/:address/analysis` çağrısı yapar.
2) Backend, Zerion’dan ilgili cüzdanın trade türündeki işlemlerini sayfalı olarak çeker ve normalize eder.
3) Normalize transferlerden ALIŞ ve SATIŞ listeleri USD tabanlı olarak oluşturulur (stable coin yardımıyla).
4) SATIŞ’lar tarihe göre dolaşılıp, aynı varlığın en eski açık lotlarına FIFO ile eşleştirilir; realized PnL hesaplanır.
5) Her SATIŞ’tan sonra birikimli PnL güncellenir (cumulative seri).
6) Açık/kısmi açık lotlar için sembol/id bazlı fiyat bulunur; unrealized PnL ve yüzde hesaplanır.
7) Realized satış parçalarından özet metrikler türetilir; tek JSON cevap döndürülür.

---

## Zerion Entegrasyonu

### İşlem ve Transfer Çekimi
- Endpoint: `GET https://api.zerion.io/v1/wallets/{address}/transactions`
- Parametreler:
  - `filter[operation_types]=trade`
  - `currency=usd`
  - `page[size]=100`
  - `page[after]=cursor` (sayfalama)
- Her transaction için `attributes.transfers` içindeki `in` ve `out` transferleri okunur ve şu alanlar normalize edilir:
  - `inUnits`, `outUnits` (miktar)
  - `inUsd`, `outUsd` (USD değer; yoksa stable ise 1:1 varsayımı)
  - `inSymbol`, `outSymbol`
  - `inId`, `outId` (fungible id)
  - `inPriceUsd`, `outPriceUsd` (varsa)
  - `date` ( `mined_at | timestamp | created_at` )

### Fiyat Çekimi
Öncelik sırası:
1) Sembolden fiyat: `GET /v1/fungibles?filter[query]=SYMBOL&currency=usd` (tek tek sorgulanır; eşleşen sembol seçilir)
2) Id’den fiyat: `GET /v1/fungibles?filter[ids]=id1,id2,...&currency=usd`
3) Coingecko fallback: `GET /api/v3/simple/price?ids=...&vs_currencies=usd` (yaygın semboller için mapping)

Notlar:
- Zerion tarafında sembol eşleşmesi/fiyat alanı boş dönebilir veya 500 hatası gelebilir; bu yüzden fallback katmanı vardır.
- Hâlâ fiyat bulunamazsa son çare olarak lotun `costPerUnit` değeri proxy fiyat kabul edilir.

---

## Normalize Kayıtların ALIŞ/SATIŞ’a Dönüşmesi

### Varsayımlar ve Yardımcılar
- Stable seti: `USDT, USDC, DAI, TUSD, USDP, FDUSD, BUSD`
- Zaman sınırı: Sadece son 1 yıl analiz edilir.

### ALIŞ (BUY) oluşturma
- Kural: `inSymbol` stable değilse ve USD maliyet çıkarılabiliyorsa bu bir alıştır.
- Maliyet: `costUsd = outUsd > 0 ? outUsd : (inUsd > 0 ? inUsd : 0)`
- Birim maliyet: `costPerUnit = costUsd / inUnits` (uygunluk varsa)
- Lot yapısı:
  - `id`, `date`, `asset` (symbol), `assetIds` (varsa Zerion id),
  - `costPerUnit`, `amountUsd=costUsd`,
  - `unitsRemaining=inUnits`, `costUsdRemaining=costUsd`,
  - `sales: []`, `status: 'OPEN'`

### SATIŞ (SELL) oluşturma
- Kural: `outSymbol` stable değilse ve USD gelir çıkarılabiliyorsa bu bir satıştır.
- Gelir: `proceedsUsd = inUsd > 0 ? inUsd : (outUsd > 0 ? outUsd : 0)`
- Satılan miktar: `unitsSold = outUnits`

### Seed (Sentetik) Lotlar
- Analiz penceresinde sadece SATIŞ görünen varlıklar için ilk satış tutarıyla seed lot oluşturulur.
- `costPerUnit=null`, `unitsRemaining=null`, `costUsdRemaining=firstSale.proceedsUsd`
- Bu lotlar, units bilinmediği için satış gelirini maliyete oransal dağıtarak realized PnL üretir.

---

## FIFO Eşleştirme ve Realized PnL

### Grup ve Sıralama
- `purchases` varlık bazında gruplanır, tarih artan sıralanır.
- `sales` tarih artan sıralanır.

### İki Yol: Normal Lot ve Seed/Oransal Lot
1) Normal lot (units/costPerUnit biliniyor):
   - \( takeUnits = \min(lot.unitsRemaining, remainingUnits) \)
   - \( unitsShare = takeUnits / totalUnitsSold \)
   - \( proceedsForUnits = s.proceedsUsd \times unitsShare \)
   - \( costForUnits = lot.costPerUnit \times takeUnits \)
   - \( realizedLot = proceedsForUnits - costForUnits \)
   - Güncellemeler: `unitsRemaining`, `costUsdRemaining = lot.costPerUnit * lot.unitsRemaining`, `status`
   - Lot satış kaydı: `{ date, amountSoldUsd: proceedsForUnits, realizedPnlUsd: realizedLot, realizedPnlPercent: realizedLot / costForUnits * 100 }`

2) Seed/proportional lot (units yok):
   - \( share = remainingUnits / totalUnitsSold \)
   - \( proceedsForLot = s.proceedsUsd \times share \)
   - \( use = \min(lot.costUsdRemaining, proceedsForLot) \)
   - \( realizedLot = proceedsForLot - use \)
   - Güncellemeler: `costUsdRemaining -= use`, `status`
   - Lot satış kaydı: `{ date, amountSoldUsd: proceedsForLot, realizedPnlUsd: realizedLot, realizedPnlPercent: (use>0? realizedLot/use*100 : null) }`

### Satışın Toplam Realized PnL’i
- \( realized = s.proceedsUsd - costMatchedUsd \)
- Birikimli PnL güncellemesi: `cumulative += realized`

---

## Cumulative PnL Serisi
- Her SATIŞ sonrası: `cumulativePnlChart.push({ date: s.date, cumulativePnl })`
- Tarih sırası korunur, grafik Recharts ile çizilir.

---

## Unrealized PnL (Açık/Kısmi Açık Lotlar)

### Fiyat Kaynakları
1) Zerion sembol araması: `getPricesForSymbols([symbols])`
2) Zerion id araması: `getPricesByIds([ids])`
3) Coingecko fallback: `getPricesFromCoingecko([symbols])`
4) Son çare: `price = costPerUnit`

### Formüller
- \( currentValue = price \times unitsRemaining \)
- \( remainingCost = costPerUnit \times unitsRemaining \) (bilinmiyorsa `costUsdRemaining`)
- \( unrealizedPnlUsd = currentValue - remainingCost \)
- \( unrealizedPnlPercent = remainingCost > 0 ? \frac{unrealizedPnlUsd}{remainingCost} \times 100 : 0 \)

### Durum (status)
- `OPEN`  → hiç satılmadı / tamamen açık
- `PARTIALLY_CLOSED` → kısmen satıldı
- `CLOSED_PROFIT` → tamamen kapandı ve toplam realized ≥ 0
- `CLOSED_LOSS` → tamamen kapandı ve toplam realized < 0

---

## Cevap Şeması (Örnek)

```json
{
  "summary": {
    "winRatePercent": 24.0,
    "totalTrades": 25,
    "avgTradeSizeUsd": 1070.41
  },
  "cumulativePnlChart": [
    { "date": "2025-05-13", "cumulativePnl": 0 },
    { "date": "2025-05-14", "cumulativePnl": -1.788628 }
  ],
  "tradeHistory": [
    {
      "id": "buy-14",
      "date": "2025-08-26",
      "action": "BUY",
      "asset": "ETH",
      "costPerUnit": 4358.853149556792,
      "amountUsd": 6018.2052624,
      "unrealizedPnlUsd": 0,
      "unrealizedPnlPercent": 0,
      "status": "OPEN",
      "sales": []
    }
  ]
}
```

---

## Kenar Durumları ve Dayanıklılık
- Coin-to-coin swap: USD değerleri yoksa stable varsayımları ve transfer değerleriyle infer edilir.
- Eksik `fiat_value`/`price`: stable 1:1, sembol/id araması ve Coingecko fallback.
- Units bilinmiyorsa seed/proportional dağıtım.
- Çok küçük kalıntılar `1e-12` toleransıyla sıfırlanır.
- PnL değerleri okunaklı olsun diye `toFixed(6)` sınırı ile döndürülür.

---

## Performans ve Dayanıklılık
- Zerion rate-limit/500 durumları için geri çekilme (backoff) ve caching planı eklenebilir.
- Fiyat sonuçları kısa süreli bellek içi cache lenebilir.
- Analiz penceresi 1 yıl; daha uzun aralıklar için sayfalama ve ara toplama stratejisi önerilir.

---

## Test Senaryoları (Öneri)
- Tek ALIŞ, tek SATIŞ → realized doğrulama.
- Çoklu ALIŞ, tek SATIŞ → FIFO paylaştırma.
- Seed gerekli satış → proportional realized.
- Kısmi kapama → status ve unrealized doğrulama.
- Fiyat kaynağı kesintisi → fallback zinciri ve proxy fiyat.

---

## Geliştirme İyileştirmeleri
- Sembol→id zengin eşleme tablosu ve zincir-farkındalığı.
- Zerion/Coingecko oran sınırlayıcı ve retry/backoff stratejileri.
- Kalıcı cache (Redis) ve günlük batch fiyat snapshot’ları.
- Birim testleri: FIFO ve PnL hesabı edge case’leri.

---

## Dosya Referansları
- `src/api/routes.js` → `GET /api/explorer/:address/analysis`
- `src/services/analysisService.js` → Position Ledger üretimi
- `src/services/zerionService.js` → trade toplama ve fiyat kaynakları


