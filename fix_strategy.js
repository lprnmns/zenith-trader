const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStrategy() {
    try {
        // API bilgileri (sizin verdiğiniz - şifrelenmemiş)
        const API_KEY = '82cf6d49-61d4-4bc0-80fa-d507e11688cd';
        const SECRET_KEY = 'D34E625EAF20941DA3665B25377A26E2';
        const PASSPHRASE = 'Kgkput_4896';
        
        // Stratejiyi güncelle - API bilgilerini düz metin olarak kaydet
        // ve lastChecked'i şu anki zamana ayarla (böylece eski sinyaller alınmaz)
        const updated = await prisma.strategy.updateMany({
            where: {
                name: 'efe' // veya id ile bulabilirsiniz
            },
            data: {
                okxApiKey: API_KEY,
                okxApiSecret: SECRET_KEY,
                okxPassphrase: PASSPHRASE,
                lastChecked: new Date() // ŞU ANKİ ZAMAN - ESKİ SİNYALLERİ ALMAYACAK
            }
        });
        
        console.log('✅ Strateji güncellendi:', updated);
        
        // Güncellenen stratejiyi kontrol et
        const strategy = await prisma.strategy.findFirst({
            where: { name: 'efe' }
        });
        
        console.log('📋 Güncel strateji bilgileri:');
        console.log('- API Key:', strategy.okxApiKey?.substring(0, 10) + '...');
        console.log('- Secret:', strategy.okxApiSecret?.substring(0, 10) + '...');
        console.log('- Passphrase:', strategy.okxPassphrase);
        console.log('- Last Checked:', strategy.lastChecked);
        
    } catch (error) {
        console.error('❌ Hata:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixStrategy();
