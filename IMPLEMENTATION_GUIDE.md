# 🚀 ZENITH TRADER - KOMPLE İMPLEMENTASYON REHBERİ

## 📋 İçindekiler
1. [Proje Genel Bakış](#proje-genel-bakış)
2. [Teknik Mimari](#teknik-mimari)
3. [Kurulum ve Başlangıç](#kurulum-ve-başlangıç)
4. [Güvenlik Implementasyonu](#güvenlik-implementasyonu)
5. [Copy Trading Sistemi](#copy-trading-sistemi)
6. [Frontend Geliştirme](#frontend-geliştirme)
7. [Test Stratejisi](#test-stratejisi)
8. [Deployment](#deployment)

---

## 🎯 Proje Genel Bakış

### Vizyon
Kripto balina cüzdanlarının işlemlerini gerçek zamanlı takip eden ve bu işlemleri otomatik olarak Binance/OKX borsalarında kopyalayan profesyonel bir trading platformu.

### Ana Özellikler
- **Wallet Analytics**: Detaylı cüzdan analizi ve PnL hesaplamaları
- **Copy Trading**: Otomatik işlem kopyalama (Spot/Futures)
- **Real-time Monitoring**: 1 dakika aralıklarla pozisyon takibi
- **PWA Support**: Mobile-ready Progressive Web App
- **Multi-Exchange**: OKX ve Binance desteği (planlanan)

### Kullanıcı Tipleri
1. **Admin**: Tam yetki, copy trading kontrolü
2. **Normal User**: Wallet görüntüleme, bildirim alma

---

## 🏗️ Teknik Mimari

### Backend Stack
```
Node.js (v18+)
├── Express.js (API Framework)
├── Prisma ORM (Database)
├── PostgreSQL (Primary DB)
├── Redis (Cache - Optional)
└── Docker (Containerization)
```

### Frontend Stack
```
React 18 + TypeScript
├── Vite (Build Tool)
├── Tailwind CSS (Styling)
├── Shadcn/UI (Components)
├── React Router (Routing)
└── Service Worker (PWA)
```

### External APIs
```
├── Zerion API (Wallet data)
├── Etherscan API (Blockchain data)
├── OKX API (Trading)
├── Coingecko API (Price fallback)
└── Google OAuth (Authentication)
```

### Sistem Mimarisi
```mermaid
graph TB
    subgraph "Frontend"
        UI[React App]
        PWA[Service Worker]
    end
    
    subgraph "Backend"
        API[Express API]
        AUTH[Auth Service]
        COPY[Copy Trading Engine]
        ANALYSIS[Analysis Service]
    end
    
    subgraph "Database"
        PG[(PostgreSQL)]
        REDIS[(Redis)]
    end
    
    subgraph "External"
        ZERION[Zerion API]
        OKX[OKX API]
        GOOGLE[Google OAuth]
    end
    
    UI --> API
    PWA --> API
    API --> AUTH
    API --> COPY
    API --> ANALYSIS
    AUTH --> PG
    COPY --> PG
    ANALYSIS --> REDIS
    COPY --> OKX
    ANALYSIS --> ZERION
    AUTH --> GOOGLE
```

---

## 🛠️ Kurulum ve Başlangıç

### Ön Gereksinimler
- Node.js v18+
- Docker Desktop
- Git
- VS Code (önerilen)

### Adım 1: Repository Setup
```bash
# Projeyi klonla
git clone [repo-url]
cd zenith-trader

# Branch yapısı
git checkout -b development
```

### Adım 2: Environment Variables
`.env` dosyası oluştur:
```env
# Database
DATABASE_URL=postgresql://zenith:mysecretpassword@localhost:5432/zenith_trader_db

# API Keys
ZERION_API_KEY=your_zerion_key
ETHERSCAN_API_KEY=your_etherscan_key

# OKX API (Demo Mode)
OKX_API_KEY=your_okx_key
OKX_API_SECRET=your_okx_secret
OKX_API_PASSPHRASE=your_passphrase
OKX_DEMO_MODE=1

# JWT & Security
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
SESSION_SECRET=your_session_secret_min_32_chars

# PWA Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public
VAPID_PRIVATE_KEY=your_vapid_private
VAPID_CONTACT_EMAIL=admin@zenithtrader.com

# Google OAuth (Doldurulacak)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Adım 3: Docker & Database Setup
```bash
# PostgreSQL başlat
docker-compose up -d postgres

# Migration çalıştır
npx prisma migrate dev

# Seed data yükle
npm run seed
```

### Adım 4: Dependency Installation
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend/project
npm install
cd ../..
```

### Adım 5: Start Development
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend/project
npm run dev
```

### Erişim URL'leri
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs (planlanacak)

---

## 🔒 Güvenlik Implementasyonu

### RBAC (Role-Based Access Control)

#### Database Schema Güncellemesi
```sql
-- Users tablosu role alanı
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN google_email VARCHAR(255);
CREATE INDEX idx_users_google_id ON users(google_id);
```

#### Middleware Implementation
```javascript
// src/middleware/auth.js
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

#### Protected Routes
```javascript
// Admin-only endpoints
router.post('/api/strategies', requireAuth, requireAdmin, createStrategy);
router.put('/api/strategies/:id', requireAuth, requireAdmin, updateStrategy);
router.delete('/api/strategies/:id', requireAuth, requireAdmin, deleteStrategy);
router.post('/api/copy-trading/start', requireAuth, requireAdmin, startCopyTrading);
```

### Google OAuth Integration

#### Backend Setup
```javascript
// src/services/googleAuth.js
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: 'http://localhost:3001/api/auth/google/callback'
});

// Auth endpoints
router.get('/api/auth/google', redirectToGoogle);
router.get('/api/auth/google/callback', handleGoogleCallback);
router.get('/api/auth/me', requireAuth, getCurrentUser);
router.post('/api/auth/logout', logout);
```

#### Frontend Integration
```tsx
// src/components/auth/GoogleLogin.tsx
const GoogleLoginButton = () => {
  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };
  
  return (
    <Button onClick={handleLogin}>
      <GoogleIcon /> Sign in with Google
    </Button>
  );
};
```

---

## 💹 Copy Trading Sistemi

### System Requirements

#### Trading Parameters
```yaml
Exchange Settings:
  - Default Quote: USDT
  - Product Type: Perpetual Futures
  - Position Mode: One-way
  - Margin Mode: Cross
  
Position Management:
  - Long Leverage: 3x (default)
  - Short Leverage: 1x (default)
  - Close Behavior: Close only (no auto-reverse)
  
Size & Limits:
  - Equity Allocation: 10% per signal
  - Min Notional: $10 USDT
  - Max Notional: $10,000 USDT per trade
  - Max Open Positions: 10
  
Risk Management:
  - Daily Loss Limit: 20%
  - Max Drawdown: 30%
  - Slippage Tolerance: 50 bps
  
Execution:
  - Order Type: Market
  - Retry Attempts: 3
  - Retry Delay: 1s, 2s, 4s (exponential)
```

### Database Schema
```sql
-- Strategies table
CREATE TABLE strategies (
  id UUID PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id),
  target_wallet_address TEXT NOT NULL,
  exchange TEXT DEFAULT 'okx',
  mode TEXT DEFAULT 'futures',
  leverage INTEGER DEFAULT 3,
  margin_mode TEXT DEFAULT 'cross',
  equity_allocation_percent DECIMAL(5,2) DEFAULT 10.00,
  min_notional_usdt DECIMAL(10,2) DEFAULT 10.00,
  max_notional_usdt DECIMAL(10,2) DEFAULT 10000.00,
  max_open_positions INTEGER DEFAULT 10,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Executions table
CREATE TABLE strategy_executions (
  id UUID PRIMARY KEY,
  strategy_id UUID REFERENCES strategies(id),
  source_event_id TEXT,
  action TEXT, -- open, close, increase, reduce
  symbol TEXT,
  side TEXT, -- buy, sell
  requested_size_usdt DECIMAL(10,2),
  executed_size_usdt DECIMAL(10,2),
  price DECIMAL(20,8),
  okx_order_id TEXT,
  status TEXT, -- success, failed, skipped
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Signal Processing Flow
```javascript
// src/services/signalProcessor.js
class SignalProcessor {
  async processWalletSignal(walletAddress, signal) {
    // 1. Validate signal
    if (!this.validateSignal(signal)) return;
    
    // 2. Map token (WETH -> ETH, WBTC -> BTC)
    const mappedSymbol = this.mapToken(signal.token);
    
    // 3. Check if tradeable on OKX
    if (!await this.isTradeableOnOKX(mappedSymbol)) {
      return this.skipSignal(signal, 'Symbol not available');
    }
    
    // 4. Calculate position size
    const size = this.calculatePositionSize(signal);
    
    // 5. Execute trade
    return await this.executeTrade({
      symbol: mappedSymbol,
      side: signal.type, // BUY or SELL
      size: size,
      leverage: signal.type === 'BUY' ? 3 : 1
    });
  }
}
```

---

## 🎨 Frontend Geliştirme

### Component Structure
```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── GoogleLogin.tsx
│   │   └── ProtectedRoute.tsx
│   ├── wallet/
│   │   ├── WalletExplorer.tsx
│   │   ├── WalletAnalysis.tsx
│   │   └── PositionLedger.tsx
│   ├── strategy/
│   │   ├── StrategyWizard.tsx
│   │   ├── StrategyList.tsx
│   │   └── StrategyDetails.tsx
│   └── common/
│       ├── Layout.tsx
│       ├── Navigation.tsx
│       └── LoadingSpinner.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Explorer.tsx
│   ├── Strategies.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   └── useNotifications.ts
└── services/
    ├── api.ts
    ├── auth.ts
    └── websocket.ts
```

### State Management
```typescript
// src/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
}

// src/contexts/StrategyContext.tsx
interface StrategyContextType {
  strategies: Strategy[];
  activeStrategy: Strategy | null;
  createStrategy: (data: StrategyFormData) => Promise<void>;
  updateStrategy: (id: string, data: Partial<Strategy>) => Promise<void>;
  deleteStrategy: (id: string) => Promise<void>;
}
```

### PWA Configuration
```javascript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Zenith Trader',
        short_name: 'Zenith',
        theme_color: '#1a1a1a',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300
              }
            }
          }
        ]
      }
    })
  ]
};
```

---

## 🧪 Test Stratejisi

### Test Coverage Requirements
- Unit Tests: 80% minimum
- Integration Tests: Critical paths
- E2E Tests: Main user flows

### Test Structure
```
tests/
├── unit/
│   ├── services/
│   ├── utils/
│   └── components/
├── integration/
│   ├── api/
│   └── database/
└── e2e/
    ├── auth.spec.ts
    ├── wallet.spec.ts
    └── strategy.spec.ts
```

### Example Test Cases
```javascript
// tests/unit/services/signalProcessor.test.js
describe('SignalProcessor', () => {
  it('should map WETH to ETH correctly', () => {
    const result = processor.mapToken('WETH');
    expect(result).toBe('ETH');
  });
  
  it('should calculate position size with leverage', () => {
    const signal = { amount: 1000, type: 'BUY' };
    const size = processor.calculatePositionSize(signal);
    expect(size).toBe(3000); // 3x leverage
  });
});
```

---

## 🚀 Deployment

### Production Environment Setup

#### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

#### Docker Compose Production
```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    
  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
      
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          npm ci
          npm test
          
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app/zenith-trader
            git pull
            docker-compose down
            docker-compose up -d --build
```

### Monitoring & Logging
```javascript
// src/utils/logger.js
const winston = require('winston');
const { Logtail } = require('@logtail/node');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new Logtail({ token: process.env.LOGTAIL_TOKEN })
  ]
});
```

---

## 📊 Performance Optimization

### Database Optimization
```sql
-- Critical indexes
CREATE INDEX idx_executions_strategy_id ON strategy_executions(strategy_id);
CREATE INDEX idx_executions_created_at ON strategy_executions(created_at DESC);
CREATE INDEX idx_signals_wallet_processed ON position_signals(wallet_address, processed);
```

### Caching Strategy
```javascript
// Redis caching for wallet data
const cacheKey = `wallet:${address}:analysis`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await analyzeWallet(address);
await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 min cache
```

---

## 🔧 Troubleshooting

### Common Issues

#### PostgreSQL Lock Issue
```bash
# Clear advisory locks
docker exec -it zenith-trader-db-1 psql -U zenith -d zenith_trader_db -c "SELECT pg_advisory_unlock_all();"
```

#### Port Already in Use
```bash
# Find and kill process
netstat -ano | findstr :3001
taskkill /PID [process_id] /F
```

#### Migration Failed
```bash
# Reset database
npx prisma migrate reset --force
npx prisma migrate dev
```

---

## 📚 Additional Resources

- [Zerion API Documentation](https://docs.zerion.io)
- [OKX API Documentation](https://www.okx.com/docs-v5/en/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev)

---

## 🤝 Support

For questions or issues:
- Create an issue in the repository
- Contact: admin@zenithtrader.com
- Documentation updates: Check `/docs` folder

---

*Last Updated: September 2025*
*Version: 1.0.0*
