// src/core/strategyEngine.js
const { PrismaClient } = require('@prisma/client');
const zerionService = require('../services/zerionService');
const positionSignalService = require('../services/positionSignalService');
const OKXService = require('../services/okxService');
const notificationService = require('../services/notificationService');

const prisma = new PrismaClient();
let activeStrategies = new Map();

/**
 * Veritabanından aktif stratejileri yükler ve her biri için özel bir OKX istemcisi oluşturur.
 */
async function loadStrategies() {
	console.log('[Engine] Aktif stratejiler veritabanından yükleniyor...');
	const strategiesFromDB = await prisma.strategy.findMany({ where: { isActive: true } });
	activeStrategies.clear();

	for (const dbStrategy of strategiesFromDB) {
		const okxClient = new OKXService(
			dbStrategy.okxApiKey,
			dbStrategy.okxApiSecret,
			dbStrategy.okxPassphrase,
			true // Demo mode
		);

		activeStrategies.set(dbStrategy.id, {
			...dbStrategy,
			okxClient,
		});
	}
	console.log(`[Engine] ${activeStrategies.size} adet aktif strateji belleğe yüklendi.`);
}

/**
 * Tüm aktif stratejiler için periyodik sinyal kontrolü yapar ve emirleri tetikler.
 */
async function runSignalCheck() {
	if (activeStrategies.size === 0) {
		return;
	}

	console.log(`[Engine] ${activeStrategies.size} strateji için sinyal kontrol döngüsü başlatılıyor...`);
	for (const [id, strategy] of activeStrategies.entries()) {
		const checkTime = new Date();
		const newSignals = await positionSignalService.getNewPositionSignals(strategy.walletAddress, strategy.lastChecked);

		if (Array.isArray(newSignals) && newSignals.length > 0) {
			console.log(`🔥 [${strategy.name}] için ${newSignals.length} yeni sinyal bulundu!`);
			for (const signal of newSignals) {
				try {
					// 1) İzin verilen token listesi kontrolü
					if (!Array.isArray(strategy.allowedTokens) || !strategy.allowedTokens.includes(signal.token)) {
						console.log(`-> [${strategy.name}] Emir Atlandı: ${signal.token} izin verilenler listesinde değil.`);
						continue;
					}

					// 2) Emir parametreleri (SWAP trading için - futures demo başarılı)
					const instrumentId = `${signal.token}-USDT-SWAP`;
					const side = signal.type === 'BUY' ? 'buy' : 'sell';
					const orderType = 'market';

					// Pozisyon yüzdesine göre işlem büyüklüğü hesaplama
					// Cüzdanın toplam değerinin yüzdesi kadar işlem aç
					const walletTotalValue = signal.totalValue;
					const positionPercentage = signal.percentage;
					const sizeInUsdt = (walletTotalValue * positionPercentage) / 100;
					
					if (!sizeInUsdt || sizeInUsdt <= 0) {
						console.log(`-> [${strategy.name}] Emir Atlandı: Geçersiz sizeInUsdt (${sizeInUsdt}).`);
						continue;
					}
					
					// Minimum işlem büyüklüğü kontrolü (10 USDT)
					if (sizeInUsdt < 10) {
						console.log(`-> [${strategy.name}] Emir Atlandı: Çok küçük pozisyon (${sizeInUsdt.toFixed(2)} USDT).`);
						continue;
					}
					
					// Kaldıraç ayarı (signal'dan geliyor: 3x LONG, 1x SHORT)
					const leverage = signal.leverage || 3;

					// 3) Kaldıraç ayarla (SWAP trading için)
					try {
						console.log(`🔧 [${strategy.name}] Kaldıraç ayarlanıyor...`);
						await strategy.okxClient.setLeverage(instrumentId, leverage.toString(), 'isolated');
						console.log(`✅ [${strategy.name}] Kaldıraç ${leverage}x ayarlandı.`);
					} catch (leverageError) {
						console.log(`❌ [${strategy.name}] Kaldıraç ayarlanamadı:`, leverageError?.response?.data?.msg || leverageError?.message);
						continue;
					}

					// 4) Son fiyatı al ve büyüklüğü hesapla
					const tickerArr = await strategy.okxClient.getTicker(instrumentId);
					const lastPrice = parseFloat(Array.isArray(tickerArr) ? tickerArr[0]?.last : tickerArr?.last);
					if (!lastPrice || lastPrice <= 0) {
						throw new Error('Geçerli fiyat alınamadı.');
					}

					// SWAP trading için contract sayısı hesaplama
					const sizeInContracts = sizeInUsdt / lastPrice;
					const finalSize = sizeInContracts.toFixed(2); // SWAP için 2 decimal

					// Size kontrolü
					if (Number(finalSize) <= 0) {
						console.log(`-> [${strategy.name}] Emir Atlandı: Size çok küçük (${finalSize})`);
						continue;
					}

					console.log(`-> [${strategy.name}] Emir Hazırlandı: ${side.toUpperCase()} ${finalSize} ${signal.token} (${sizeInUsdt.toFixed(2)} USDT x${leverage})`);
					console.log(`🔍 [${strategy.name}] Emir detayları:`, {
						instrumentId,
						side,
						orderType,
						sizeInUsdt: sizeInUsdt.toFixed(2),
						leverage: leverage,
						lastPrice,
						sizeInContracts: sizeInContracts.toFixed(4),
						finalSize,
						positionPercentage: positionPercentage.toFixed(2) + '%'
					});

					// 5) Gerçek emir gönderimi (SWAP trading)
					let orderResponse;
					try {
						console.log(`🔍 [${strategy.name}] Emir gönderiliyor...`);
						orderResponse = await strategy.okxClient.submitOrder(
							instrumentId,
							'isolated',
							side,
							orderType,
							finalSize
						);
						console.log(`🔍 [${strategy.name}] OKX Response:`, JSON.stringify(orderResponse, null, 2));
					} catch (orderError) {
						console.error(`🔍 [${strategy.name}] Order Error Details:`, {
							message: orderError?.message,
							response: orderError?.response?.data,
							status: orderError?.response?.status,
							statusText: orderError?.response?.statusText,
							stack: orderError?.stack?.split('\n')[0]
						});
						throw orderError; // Re-throw to be caught by outer catch
					}

					// Emir sonucunu kontrol et
					if (orderResponse?.code === '0') {
						const order = Array.isArray(orderResponse.data) ? orderResponse.data[0] : orderResponse.data;
						if (order?.ordId) {
							console.log(`✅ [${strategy.name}] BAŞARILI: Emir ${order.ordId} OKX'e gönderildi.`);
							
							// 5) Push notification gönder (userId olduğunu varsayıyoruz - test için 'user1')
							try {
								const tradeData = {
									strategyId: strategy.id,
									id: order.ordId,
									token: signal.token,
									amount: finalSize,
									price: lastPrice.toFixed(2),
									type: signal.type
								};
								
								// Test için sabit userId kullanıyoruz, gerçekte strategy'ye ait userId olacak
								const userId = strategy.userId || 'user1'; 
								const action = signal.type === 'BUY' ? 'open' : 'close';
								
								await notificationService.sendTradeNotification(
									userId,
									strategy.name,
									tradeData,
									action
								);
								
								console.log(`📱 [${strategy.name}] Push notification sent for ${signal.type} ${signal.token}`);
							} catch (notifError) {
								console.error(`📱 [${strategy.name}] Notification failed:`, notifError.message);
							}
						} else {
							throw new Error(`Emir ID alınamadı: ${JSON.stringify(orderResponse)}`);
						}
					} else {
						// Emir başarısız oldu
						const errorMsg = orderResponse?.data?.[0]?.sMsg || orderResponse?.msg || 'Bilinmeyen hata';
						throw new Error(`Emir başarısız: ${errorMsg}`);
					}
				} catch (error) {
					console.error(`❌ [${strategy.name}] Emir Gönderilemedi:`, error?.response?.data || error?.msg || error?.message || error);
					console.error(`🔍 [${strategy.name}] Detaylı hata:`, {
						response: error?.response?.data,
						status: error?.response?.status,
						statusText: error?.response?.statusText,
						message: error?.message,
						stack: error?.stack?.split('\n')[0]
					});
				}
			}
		}

		// Update lastChecked to avoid duplicate signal processing
		await prisma.strategy.update({
			where: { id: strategy.id },
			data: { lastChecked: checkTime },
		});
		strategy.lastChecked = checkTime;
	}
}

/**
 * Strateji motorunu başlatır.
 * @param {number} intervalMs - Kontrol döngüsü aralığı (milisaniye).
 */
async function start(intervalMs = 30000) {
	await loadStrategies();
	console.log(`[Engine] Strateji motoru başlatıldı. Kontrol aralığı: ${intervalMs / 1000} saniye.`);
	setInterval(runSignalCheck, intervalMs);
}

module.exports = { start, loadStrategies };


