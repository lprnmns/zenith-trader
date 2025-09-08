// src/core/strategyEngine.js
const { PrismaClient } = require('@prisma/client');
const zerionService = require('../services/zerionService');
const positionSignalService = require('../services/positionSignalService');
const OKXService = require('../services/okxService');
const notificationService = require('../services/notificationService');
const adminNotificationService = require('../services/adminNotificationService');

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
		// API bilgileri artık düz metin olarak saklanıyor
		const okxClient = new OKXService(
			dbStrategy.okxApiKey,
			dbStrategy.okxApiSecret,
			dbStrategy.okxPassphrase,
			false // Live mode - API anahtarları canlı ortam için
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
		
		// Use server start time if this is the first check (no lastChecked)
		const sinceDate = strategy.lastChecked || new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago if first check
		
		console.log(`[Engine] [${strategy.name}] için sinyal kontrolü başlatılıyor... Son kontrol: ${sinceDate.toLocaleString()}`);
		
		const newSignals = await positionSignalService.getNewPositionSignals(strategy.walletAddress, sinceDate);

			if (Array.isArray(newSignals) && newSignals.length > 0) {
				console.log(`🔥 [${strategy.name}] için ${newSignals.length} yeni sinyal bulundu!`);
				
				// Notify admin about position detection (only for admin strategies)
				if (strategy.user?.email === 'manasalperen@gmail.com' || strategy.userId === 1) {
					for (const sig of newSignals) {
						await adminNotificationService.notifyPositionDetection({
							...sig,
							walletAddress: strategy.walletAddress
						});
					}
				}
				
				for (const signal of newSignals) {
				try {
					// 1) İzin verilen token listesi kontrolü
					// Eğer allowedTokens boş ise tüm coinlere izin var demektir
					if (Array.isArray(strategy.allowedTokens) && strategy.allowedTokens.length > 0 && !strategy.allowedTokens.includes(signal.token)) {
						console.log(`-> [${strategy.name}] Emir Atlandı: ${signal.token} izin verilenler listesinde değil.`);
						continue;
					}

					// Token mapping: DEX isimleri -> OKX isimleri
					const tokenMapping = {
						'WBTC': 'BTC',     // Wrapped BTC -> BTC
						'WETH': 'ETH',     // Wrapped ETH -> ETH
						'WMATIC': 'MATIC', // Wrapped MATIC -> MATIC
						'WAVAX': 'AVAX',   // Wrapped AVAX -> AVAX
						'WBNB': 'BNB',     // Wrapped BNB -> BNB
						'stETH': 'ETH',    // Staked ETH -> ETH
						'cbETH': 'ETH',    // Coinbase ETH -> ETH
						'rETH': 'ETH',     // Rocket Pool ETH -> ETH
						'USDC': 'USDT',    // USDC -> USDT (OKX futures genelde USDT)
						'USDC.e': 'USDT',  // Bridged USDC -> USDT
						'DAI': 'USDT',     // DAI -> USDT
						'BUSD': 'USDT',    // BUSD -> USDT
						'FRAX': 'USDT',    // FRAX -> USDT
						// Diğer mapping'ler eklenebilir
					};
					
					// Token'ı map et veya aynısını kullan
					const okxToken = tokenMapping[signal.token] || signal.token;
					
					// 2) Emir parametreleri (SWAP trading için)
					const instrumentId = `${okxToken}-USDT-SWAP`;
					
					// Log mapping if different
					if (okxToken !== signal.token) {
						console.log(`🔄 [${strategy.name}] Token mapping: ${signal.token} -> ${okxToken}`);
					}
					const side = signal.type === 'BUY' ? 'buy' : 'sell';
					const orderType = 'market';

					// Önce OKX'ten mevcut bakiyeyi çekelim
					let accountBalance;
					try {
						const balanceResponse = await strategy.okxClient.getBalance();
						const usdtBalance = balanceResponse[0]?.details?.find(d => d.ccy === 'USDT');
						accountBalance = parseFloat(usdtBalance?.availBal || 0);
						console.log(`💰 [${strategy.name}] Mevcut bakiye: ${accountBalance.toFixed(2)} USDT`);
					} catch (balanceError) {
						console.error(`❌ [${strategy.name}] Bakiye alınamadı:`, balanceError.message);
						continue;
					}

					// Pozisyon yüzdesine göre işlem büyüklüğü hesaplama
					// TAKIP EDILEN CÜZDANIN YÜZDESINI AYNEN KULLAN
					// Örnek: Cüzdan %7 ile aldıysa, biz de kendi bakiyemizin %7'si ile alacağız
					const walletPercentage = signal.percentage; // Takip edilen cüzdanın kullandığı yüzde
					const sizeInUsdt = (accountBalance * walletPercentage) / 100;
					
					// Log signal details
					console.log(`📊 [${strategy.name}] Signal: ${signal.token} ${signal.type} - Wallet %${signal.percentage.toFixed(2)} = ${sizeInUsdt.toFixed(2)} USDT from our ${accountBalance.toFixed(2)} USDT`);
					
					if (!sizeInUsdt || sizeInUsdt <= 0) {
						console.log(`-> [${strategy.name}] Emir Atlandı: Geçersiz sizeInUsdt (${sizeInUsdt}).`);
						continue;
					}
					
					// Minimum kontrolü yok - OKX API zaten hata verecek
					
					// Kaldıraç ayarı (signal'dan geliyor: 3x LONG, 1x SHORT)
					const leverage = signal.leverage || 3;

					// 3) Kaldıraç ayarla (SWAP trading için)
					// OKX futures için posSide parametresi gerekli
					const posSide = signal.type === 'BUY' ? 'long' : 'short';
					try {
						console.log(`🔧 [${strategy.name}] Kaldıraç ayarlanıyor...`);
						await strategy.okxClient.setLeverage(instrumentId, leverage.toString(), 'isolated', posSide);
						console.log(`✅ [${strategy.name}] Kaldıraç ${leverage}x ayarlandı.`);
					} catch (leverageError) {
						console.log(`❌ [${strategy.name}] Kaldıraç ayarlanamadı:`, leverageError?.response?.data?.msg || leverageError?.message);
						continue;
					}

					// 4) Enstrüman bilgilerini al
					let instrumentInfo;
					try {
						instrumentInfo = await strategy.okxClient.getInstrumentDetails(instrumentId);
						if (!instrumentInfo) {
							console.log(`⚠️ [${strategy.name}] ${instrumentId} bilgisi alınamadı`);
							continue;
						}
					} catch (instError) {
						console.log(`⚠️ [${strategy.name}] Enstrüman bilgisi alınamadı:`, instError.message);
						continue;
					}
					
					// 5) Son fiyatı al
					const tickerArr = await strategy.okxClient.getTicker(instrumentId);
					const lastPrice = parseFloat(Array.isArray(tickerArr) ? tickerArr[0]?.last : tickerArr?.last);
					if (!lastPrice || lastPrice <= 0) {
						throw new Error('Geçerli fiyat alınamadı.');
					}

					// 6) Contract bilgilerini parse et
					const contractValue = parseFloat(instrumentInfo.ctVal);
					const lotSize = parseFloat(instrumentInfo.lotSz);
					const minSize = parseFloat(instrumentInfo.minSz);
					
					console.log(`📨 [${strategy.name}] ${okxToken} bilgileri:`, {
						contractValue,
						lotSize,
						minSize,
						lastPrice
					});
					
					// 7) Contract sayısını hesapla
					let sizeInContracts = sizeInUsdt / (contractValue * lastPrice);
					
					// Lot size'a yuvarla
					sizeInContracts = Math.round(sizeInContracts / lotSize) * lotSize;
					
					// Minimum size kontrolü
					if (sizeInContracts < minSize) {
						sizeInContracts = minSize;
					}
					
					// Hassasiyet ayarlaması
					const decimalPlaces = lotSize < 1 ? Math.abs(Math.floor(Math.log10(lotSize))) : 0;
					const finalSize = sizeInContracts.toFixed(decimalPlaces);

					// Size kontrolü
					if (Number(finalSize) <= 0) {
						console.log(`-> [${strategy.name}] Emir Atlandı: Size çok küçük (${finalSize})`);
						continue;
					}

					console.log(`-> [${strategy.name}] Emir Hazırlandı: ${side.toUpperCase()} ${finalSize} ${okxToken} (${sizeInUsdt.toFixed(2)} USDT x${leverage}, using wallet's ${walletPercentage.toFixed(2)}%)`);
					console.log(`🔍 [${strategy.name}] Emir detayları:`, {
						instrumentId,
						side,
						orderType,
						sizeInUsdt: sizeInUsdt.toFixed(2),
						leverage: leverage,
						lastPrice,
						sizeInContracts: sizeInContracts.toFixed(4),
						finalSize,
						usedPercentage: walletPercentage.toFixed(2) + '%'
					});

					// 5) Gerçek emir gönderimi (SWAP trading)
					let orderResponse;
					try {
						console.log(`🔍 [${strategy.name}] Emir gönderiliyor...`);
						orderResponse = await strategy.okxClient.submitOrder(
							instrumentId,
							'isolated',
							side,
							posSide,
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
							
							// Notify admin about successful order
							if (strategy.userId === 1) {
								await adminNotificationService.notifySignalExecution(
									{ token: okxToken, type: signal.type, sizeInUsdt },
									true,
									{ orderId: order.ordId, balance: accountBalance }
								);
							}
							
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
					console.error(`❌ [${strategy.name}] için emir hatası:`, error?.response?.data || error?.message);
					
					// Notify admin about failed order
					if (strategy.userId === 1) {
						await adminNotificationService.notifySignalExecution(
							{ token: signal.token, type: signal.type, sizeInUsdt: (accountBalance * walletPercentage) / 100 },
							false,
							{ error: error?.response?.data?.msg || error?.message, balance: accountBalance || 0 }
						);
					}
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
	
	// Sinyal kontrol döngüsü
	setInterval(runSignalCheck, intervalMs);
	
	// Yeni strateji kontrol döngüsü (her 30 saniyede bir)
	setInterval(async () => {
		const currentCount = activeStrategies.size;
		await loadStrategies();
		const newCount = activeStrategies.size;
		
		if (newCount > currentCount) {
			console.log(`[Engine] ${newCount - currentCount} yeni strateji yüklendi! Toplam: ${newCount}`);
		}
	}, 30000);
}

module.exports = { start, loadStrategies, runSignalCheck };


