const fs = require('fs');
const path = require('path');

// PWA icon boyutları
const iconSizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// Badge boyutları
const badgeSizes = [
  { size: 72, name: 'badge-72x72.png' }
];

function generateSVGIcon(size, text = 'ZT') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold">${text}</text>
</svg>`;
}

function generateBadgeSVG(size, text = 'ZT') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#ef4444"/>
  <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold">${text}</text>
</svg>`;
}

function createPublicDirectory() {
  const publicDir = 'public';
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
    console.log('✅ public klasörü oluşturuldu');
  }
}

function generateIcons() {
  console.log('🎨 PWA Icon Dosyaları Oluşturuluyor...\n');
  
  createPublicDirectory();
  
  // Icon dosyalarını oluştur
  console.log('📱 Icon dosyaları oluşturuluyor...');
  iconSizes.forEach(({ size, name }) => {
    const svgContent = generateSVGIcon(size);
    const filePath = path.join('public', name);
    
    // SVG'yi PNG olarak kaydet (basit placeholder)
    const pngPlaceholder = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    
    // Gerçek uygulamada burada SVG'den PNG'e dönüştürme yapılır
    // Şimdilik SVG dosyası olarak kaydedelim
    const svgFilePath = filePath.replace('.png', '.svg');
    fs.writeFileSync(svgFilePath, svgContent);
    console.log(`✅ ${svgFilePath} oluşturuldu`);
  });
  
  // Badge dosyalarını oluştur
  console.log('\n🔴 Badge dosyaları oluşturuluyor...');
  badgeSizes.forEach(({ size, name }) => {
    const svgContent = generateBadgeSVG(size);
    const filePath = path.join('public', name);
    const svgFilePath = filePath.replace('.png', '.svg');
    fs.writeFileSync(svgFilePath, svgContent);
    console.log(`✅ ${svgFilePath} oluşturuldu`);
  });
  
  console.log('\n🎉 PWA icon dosyaları başarıyla oluşturuldu!');
  console.log('📝 Not: Gerçek uygulamada SVG dosyalarını PNG formatına dönüştürmek için');
  console.log('   bir image processing kütüphanesi (sharp, jimp vb.) kullanılmalıdır.');
}

generateIcons();
