# Zenith Trader – Mobil Fix Uygulama Planı

Bu plan, mobil PWA’da tespit edilen sorunların önceliklendirilmesi ve uygulanması adımlarını içerir.

## Önceliklendirme

### Priority 1 – Kritik (Önce yapılacaklar)
1. Navigasyon menüsü tıklandığında ekranın kilitlenmesi (0b5d0a02…)
2. Wallet Explorer / Suggested Wallets üst üste binme (11f0ff4e…, 972c7fbb…)
3. Beyaz butonların dark tema ile uyumsuzluğu (genel)

### Priority 2 – Önemli
4. PWA install prompt teması (49e4d9a6…)
5. PWA logo’yu mavimsi-yıldırım ile güncelleme (63be4243…)
6. Dashboard spacing ve boyut optimizasyonu (562be19d…)

### Priority 3 – İyileştirme
7. Premium request ekranını sıkıştırma + sticky CTA (379b779b…)
8. Notifications sayfası görsel/UX iyileştirmeleri (20acdd01…)

---

## Uygulama Adımları

### Task 1: Navigasyon / Modal Backdrop Freeze
- Belirti: Drawer/Modal açılınca tüm ekran siyaha yakın kararıyor, arka plan focus lock’tan çıkmıyor.
- Olası nedenler: z-index çakışması, `pointer-events: none`/`auto` dengesizliği, body scroll lock hatası.
- Çözüm:
  - Mobile drawer bileşenini ayrılaştır (`MobileMenu.tsx`).
  - Backdrop için sabit z-index (örn. 40), drawer 50, header 30 düzeni.
  - `onOpenChange`, `onEscapeKeyDown`, `onPointerDownOutside` ile kapatma senaryoları.
  - Body scroll lock için `overflow-hidden` toggle’ı.
- Dosyalar: `src/components/layout/Header.tsx`, `src/components/layout/MobileMenu.tsx` (yeni), ilgili CSS.
- Kabul kriteri: Menü aç/kapa sorunsuz; alt katman clickable değil; kapatınca tüm etkileşim geri gelir.

### Task 2: Wallet Explorer – Suggested Wallets
- Belirti: Kartlar üst üste biniyor, responsive kırılıyor.
- Çözüm:
  - Mobile’da horizontal carousel (Embla veya Swiper) + kart genişliği ~ 88vw, snap.
  - Pagination dots + smooth touch.
  - 2+ satır metinlerde overflow clamp.
- Dosyalar: `src/components/wallet/SuggestedWallets.tsx` (yeni), `src/pages/WalletExplorer.tsx`.
- Kabul kriteri: 320–430px arası düzgün; kartlar çakışmaz.

### Task 3: Tema – Button Varyantları
- Belirti: Beyaz butonlar dark temada göze batıyor.
- Çözüm:
  - Global `.btn` sınıfları: primary, secondary, ghost, outline.
  - Primary: `bg-emerald-600 hover:bg-emerald-700 text-white`.
  - Secondary: `bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700`.
  - Ghost: `bg-transparent text-slate-200 hover:bg-slate-800/60`.
- Dosyalar: `src/index.css`, bileşenlerde sınıf değişimleri.
- Kabul kriteri: Tüm sayfalarda tutarlı butonlar.

### Task 4: PWA Install Prompt
- Çözüm: `beforeinstallprompt` yakala, custom UI göster; manifest `theme_color` uyumlu.
- Dosyalar: `src/components/pwa/InstallPrompt.tsx` (yeni), `index.html`, `public/manifest.json`.

### Task 5: PWA Logo
- Çözüm: Mavimsi-yıldırım logodan maskable + any PNG set üret; manifest `icons` güncelle.

### Task 6: Dashboard Spacing
- Çözüm: Mobil için daha sıkı card padding (p-3→p-2), gap’ler (gap-6→gap-3), chart h-48→h-40.

### Task 7: Premium Request
- Çözüm: Formu iki kolondan teke indir; tipografi küçültme; alt sağda sticky CTA.

### Task 8: Notifications
- Çözüm: Buton varyantlarını uygula; opsiyonel swipe-to-dismiss; okundu/okunmadı ayrımı.

---

## İzleme ve Dağıtım
- Her task ayrı commit mesajı ile.
- Gerekirse feature branch: `feat/mobile-<task-name>`.
- Deploy sonrası cihaz testleri: Android Chrome (light/dark), iOS Safari (mümkünse).
