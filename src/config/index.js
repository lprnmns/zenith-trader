// src/config/index.js
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
	serverPort: process.env.PORT || 3001,
	zerionApiKey: process.env.ZERION_API_KEY,
	etherscanApiKey: process.env.ETHERSCAN_API_KEY,
	okx: {
		apiKey: process.env.OKX_API_KEY,
		apiSecret: process.env.OKX_API_SECRET,
		passphrase: process.env.OKX_API_PASSPHRASE,
		isDemo: process.env.OKX_DEMO_MODE === '1',
	},
	vapid: {
		publicKey: process.env.VAPID_PUBLIC_KEY,
		privateKey: process.env.VAPID_PRIVATE_KEY,
		contactEmail: process.env.VAPID_CONTACT_EMAIL,
	},
	TOP_100_SYMBOLS: [
		'BTC','ETH','USDT','USDC','BNB','XRP','ADA','SOL','DOGE','TRX','TON','DOT','AVAX','MATIC','SHIB','LINK','UNI','LTC','ATOM','ETC','XMR','BCH','APT','ARB','OP','NEAR','IMX','AAVE','SUI','MKR','INJ','FIL','RUNE','ALGO','FLOW','HBAR','QNT','VET','TIA','SEI','STX','GRT','FTM','SNX','RNDR','PEPE','BONK','PYTH','AXS','DYDX','ORDI','JUP','WIF','WOO','ZRO','MANTA','ZETA','STRK','APTOS','SAGA','KAS','KAVA','SAND','MANA','ENJ','AGIX','FET','OCEAN','SKL','1INCH','COMP','CRV','BAL','SUSHI','YFI','UMA','ZRX','BAT','CHZ','GMT','APE','LDO','ARB','OP','RDNT','GMX','CAKE','CELO','MINA','HNT','KDA','XLM','XDC','ICP','EGLD','KSM','GALA','ENS','FLUX'
	],
	// Seed ERC-20 token contract addresses for autonomous candidate discovery
	SEED_TOKEN_IDS: [
		'0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
		'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH  
		'0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
		'0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
		'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
		'0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
	],
};



