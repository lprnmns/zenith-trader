// server.js
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const config = require('./src/config');
const apiRoutes = require('./src/api/routes');
const googleAuthRoutes = require('./src/api/googleAuthRoutes');
const adminRoutes = require('./src/routes/admin');
const notificationRoutes = require('./src/routes/notifications');
const healthRoutes = require('./src/routes/health');
const strategyEngine = require('./src/core/strategyEngine');
const alphaFinder = require('./src/workers/alphaFinder');

const app = express();

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(express.json());

// Configure CORS properly for OAuth and dev environment
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// API Routes
app.use('/api', apiRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/', healthRoutes);

async function startServer() {
	console.log('Sunucu başlatılıyor...');

	// Arka plan strateji motorunu başlat
	await strategyEngine.start();

	// Alpha Finder engine: DISABLED (manual control only)
	// try {
	// 	await alphaFinder.runOnce();
	// 	setInterval(() => {
	// 		alphaFinder.runOnce().catch((e) => console.warn('[AlphaFinder] periodic run error', e.message));
	// 	}, 24 * 60 * 60 * 1000);
	// 	console.log('[AlphaFinder] scheduled.');
	// } catch (e) {
	// 	console.warn('[AlphaFinder] initial run failed', e.message);
	// }
	console.log('[AlphaFinder] disabled - use manual test scripts to run analysis.');

	app.listen(config.serverPort, () => {
		console.log(`🚀 Sunucu http://localhost:${config.serverPort} adresinde çalışıyor`);
	});
}

startServer();


