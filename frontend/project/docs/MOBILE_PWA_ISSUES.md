# Zenith Trader – Mobil PWA Sorun Listesi (Screenshots Bazlı)

Bu doküman sadece mobil sürümde gözlenen sorunları, ilgili ekran görüntüsü dosya adları ile birlikte takip etmek içindir.

## Kaynak Klasör
D: \ projeler \ zenith-trader \ mobil_uyumluluk_sonrası_ekran_görüntüleri

## Sorunlar (User QA Notlarıyla)

1) 0b5d0a02-1379-4466-8701-977424896f44.jpg
   - Sorun: Sol-üstteki 3 noktaya basınca ekran kararıyor ve bir şeye basılamıyor.
   - Tip: Navigation / Modal-Backdrop / Z-index / Focus Lock

2) 11f0ff4e-ccfb-478c-9984-088aa9818ca5.jpg
   - Sorun: Wallet Explorer -> Suggested wallets bölümü birbirine giriyor. Mobil için yeni bir layout lazım.
   - Tip: Responsive Layout / Carousel / Card Spacing

3) 20acdd01-16e3-414f-b260-61f83160012f.jpg
   - Not: Notifications sayfası fena değil. İyileştirme önerileri değerlendirilecek.
   - Sorun: Beyaz butonlar dark tema ile uyumsuz.
   - Tip: Theming / Button Variants

4) 49e4d9a6-2ee4-4062-80a5-9059b345f509.jpg
   - Sorun: Chrome PWA uygulama yükleme bildirimi (install prompt) aşırı beyaz ve temayla uyumsuz.
   - Tip: PWA Install UI / Custom Prompt / Manifest theme_color

5) 63be4243-165c-490e-a76b-d50d15a6237c.jpg
   - Sorun: Uygulama logosu tek renk olarak görünüyor; ana logonun (mavimsi-yıldırım) kullanılması isteniyor.
   - Tip: PWA Icons / Maskable / Asset Pipeline

6) 379b779b-447f-4c09-82fe-b9c473e0756c.jpg
   - Sorun: Premium request sayfası tek ekrana sığmıyor; kullanıcı ekranın tamamını görmek için kaydırmak zorunda.
   - İstek: Biraz küçült, tek ekrana yaklaştır; Request butonu kayar (sticky/FAB) olsun.
   - Tip: Layout Compression / Sticky CTA

7) 562be19d-1d68-4870-83b0-f562352863ef.jpg
   - Sorun: Dashboard’da aralıklar çok fazla, öğeler çok büyük; sayfa aşırı uzun.
   - Tip: Spacing / Typography / Card Density / Chart Sizing

8) 972c7fbb-ad49-4663-9127-9a0734d4e7b0.jpg
   - Sorun: Wallet Explorer sayfasında suggested wallets üst üste binmiş (2. maddede de benzer).
   - Tip: Responsive Grid / Horizontal Scroll

## Genel Tema Problemleri
- Beyaz butonlar: Dark tema ile uyumsuz; kendi color scale’ımızla uyumlu hale getirilecek.
- Header/brand rengi: Arka plan ile kontrast sorunları var (gerekliyse).

## İzleme
- Her sorunun çözüm durumu ve commitleri MOBILE_FIX_PLAN.md üzerinden linklenecek.
