# Zenith Trader Proje Dokümantasyonu

## Proje Genel Bakış

Zenith Trader, kripto para trader'larının profesyonel trader'ları kopyalamasına ve otomatik stratejiler oluşturmasına olanak tanıyan gelişmiş bir copy trading platformudur. Proje, Docker containerization ile dağıtımı yapılmış modern bir web uygulamasıdır.

### Proje Mimarisi

```
Frontend (React + Vite)
    ↓
Backend (Node.js + Express + Prisma)
    ↓
Database (PostgreSQL)
    ↓
Cache (Redis)
    ↓
External APIs (Zerion, OKX, Etherscan, Google OAuth)
```

## Teknoloji Stack ve Kullanım Alanları

### 1. Frontend Teknolojileri

- **React**: UI framework olarak kullanılıyor
- **Vite**: Build tool ve development server
- **TypeScript**: Tip güvenliği için
- **Tailwind CSS**: Styling için
- **React Router**: Client-side routing
- **Zustand**: State management
- **Axios**: HTTP client
- **React Query**: Server state management
- **PWA**: Progressive Web App özellikleri

### 2. Backend Teknolojileri

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **Prisma ORM**: Database ORM ve migrations
- **PostgreSQL**: Ana veritabanı
- **Redis**: Caching ve session management
- **JWT**: Authentication
- **bcrypt**: Password hashing
- **nodemailer**: Email gönderimi
- **socket.io**: Real-time communication (planlanan)

### 3. External API Entegrasyonları

- **Zerion API**: Wallet analytics ve portfolio tracking
- **OKX API**: Trading operations
- **Etherscan API**: Blockchain data
- **Google OAuth**: Authentication
- **Push Notifications**: VAPID protocol

## Proje Yapısı ve Dosya Organizasyonu

### Backend Yapısı

```
src/
├── api/
│   ├── routes.js              # Ana API rotaları
│   ├── googleAuthRoutes.js    # Google OAuth rotaları
│   ├── notificationRoutes.js  # Bildirim rotaları
│   └── authRoutes.js          # Authentication rotaları
├── services/
│   ├── strategyService.js     # Strateji yönetimi
│   ├── googleAuthService.js   # Google OAuth servisi
│   ├── zerionService.js      # Zerion API entegrasyonu
│   ├── okxClient.js          # OKX trading client
│   ├── auditLogService.js    # Audit logging
│   └── ...                   # Diğer servisler
├── middleware/
│   ├── auth.js               # Authentication middleware
│   ├── strategyValidation.js  # Strateji validasyonu
│   └── ...                   # Diğer middleware'ler
├── validation/
│   └── strategyValidation.js # Zod validation schemaları
├── core/
│   ├── strategyEngine.js     # Strateji motoru
│   └── ...                   # Çekirdek sistem bileşenleri
├── utils/
│   ├── encryption.js         # Veri şifreleme
│   └── ...                   # Utility fonksiyonları
└── config.js                 # Konfigürasyon yönetimi
```

### Frontend Yapısı

```
frontend/project/src/
├── components/
│   ├── StrategyForm.tsx      # Strateji oluşturma formu
│   ├── QuickStrategyDialog.tsx # Hızlı strateji dialogu
│   ├── NotificationBell.tsx  # Bildirim bileşeni
│   └── ...                   # Diğer bileşenler
├── stores/
│   ├── strategiesStore.ts    # Strateji state management
│   └── ...                   # Diğer store'lar
├── lib/
│   ├── api.ts               # API client
│   └── ...                   # Utility kütüphaneleri
└── pages/                   # Sayfalar
```

## Veritabanı Şeması ve İlişkileri

### Ana Tablolar ve İlişkileri

```sql
-- Kullanıcılar
User {
  id: Int (PK)
  email: String (Unique)
  password: String? (Local auth için)
  role: Role (ADMIN/USER)
  googleId: String? (Google OAuth)
  googleEmail: String?
  isActive: Boolean
  createdAt: DateTime
  updatedAt: DateTime
  
  // OKX API Credentials
  okxApiKey: String?
  okxApiSecret: String?
  okxPassphrase: String?
  
  // İlişkiler
  strategies: Strategy[]
  watchedWallets: WatchedWallet[]
  notifications: UserNotification[]
  upgradeRequests: UpgradeRequest[]
}

-- Stratejiler
Strategy {
  id: Int (PK)
  name: String
  walletAddress: String
  exchange: String (OKX/Binance/Bybit)
  copyMode: String (MIRROR/REVERSE/PERCENTAGE)
  leverage: Int
  positionSize: Float
  allowedTokens: String[]
  isActive: Boolean
  currentPnL: Float
  totalPnL: Float
  tradesCount: Int
  userId: Int (FK)
  
  // OKX Credentials (Strategy-specific)
  okxApiKey: String?
  okxApiSecret: String?
  okxPassphrase: String?
  
  // Trading Configuration
  sizingMethod: String
  amountPerTrade: Float?
  percentageToCopy: Float?
  stopLoss: Float?
  dailyLimit: Int?
  
  createdAt: DateTime
  updatedAt: DateTime
  
  // Unique constraint
  @@unique([userId, walletAddress])
}

-- Strateji Executions
StrategyExecution {
  id: Int (PK)
  strategyId: Int (FK)
  executionType: String
  status: String
  signalType: String?
  token: String?
  amount: Decimal?
  price: Decimal?
  executedPrice: Decimal?
  executedAmount: Decimal?
  fee: Decimal?
  pnl: Decimal?
  errorCode: String?
  errorMessage: String?
  executionTime: Int?
  timestamp: DateTime
  
  strategy: Strategy @relation(fields: [strategyId], references: [id])
}

-- Audit Logs
AuditLog {
  id: Int (PK)
  entityType: String
  entityId: Int
  action: String
  userId: Int?
  userRole: String?
  oldValues: Json?
  newValues: Json?
  ipAddress: String?
  userAgent: String?
  status: String
  description: String?
  metadata: Json?
  timestamp: DateTime
}

-- Diğer Destek Tabloları
WatchedWallet, UserNotification, SuggestedWallet, 
TradingSignal, WalletEvent, PushSubscription, 
UpgradeRequest vs.
```

## Authentication ve Authorization Sistemi

### JWT Tabanlı Authentication

```javascript
// JWT Token Structure
{
  userId: number,
  email: string,
  role: string,
  iat: number,
  exp: number
}

// Authentication Flow
1. Kullanıcı giriş yapar (Google OAuth veya Local)
2. Server JWT token oluşturur
3. Token client'a gönderilir
4. Client her request'te token'ı Authorization header'da gönderir
5. Middleware token'ı validate eder ve user bilgilerini req.user'a ekler
```

### Role-Based Access Control

```javascript
// Roller ve İzinler
const ROLES = {
  ADMIN: 'ADMIN',  // Full access
  USER: 'USER'    // Limited access
};

// Middleware Örnekleri
requireAuth:     // Giriş yapmış kullanıcı
requireAdmin:    // Admin rolü gerektirir
requireRoles:    // Belirli rolleri kontrol eder
requireOwnership: // Resource sahibi olduğunu kontrol eder
```

## Strateji Yönetim Sistemi

### Strateji Oluşturma Süreci

```javascript
// 1. Validation (Zod Schema)
const strategyFormSchema = z.object({
  name: z.string().min(1).max(100),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  exchange: z.enum(['OKX', 'Binance', 'Bybit']),
  copyMode: z.enum(['MIRROR', 'REVERSE', 'PERCENTAGE']),
  leverage: z.number().min(1).max(125),
  // ... diğer alanlar
});

// 2. Business Logic (StrategyService)
async createStrategy(strategyData, userId) {
  // Wallet address validation (per-user)
  const existing = await prisma.strategy.findFirst({
    where: { 
      walletAddress: strategyData.walletAddress,
      userId: userId 
    }
  });
  
  if (existing) {
    throw new StrategyValidationError('You already have a strategy for this wallet address');
  }
  
  // Create strategy
  const strategy = await prisma.strategy.create({
    data: { ...strategyData, userId }
  });
  
  // Log audit action
  await this.logAuditAction({
    entityType: 'Strategy',
    entityId: strategy.id,
    action: 'CREATE',
    userId,
    newValues: strategyData
  });
  
  return strategy;
}

// 3. Database Constraint
@@unique([userId, walletAddress]) // Compound unique constraint
```

### Hızlı Strateji Oluşturma (Quick Strategy)

```javascript
// /api/strategies/quick endpoint'i
router.post('/strategies/quick', requireAuth, async (req, res) => {
  const { walletAddress, name } = req.body;
  
  // Validation
  if (!walletAddress || !name) {
    return res.status(400).json({ error: 'Wallet address and name are required' });
  }
  
  // Per-user wallet address check
  const existingStrategy = await prisma.strategy.findFirst({
    where: { 
      walletAddress,
      userId: req.user.userId
    }
  });
  
  if (existingStrategy) {
    return res.status(400).json({ error: 'You already have a strategy for this wallet address' });
  }
  
  // Pre-configured settings
  const quickStrategyData = {
    name,
    walletAddress,
    exchange: 'OKX',
    copyMode: 'Perpetual',
    leverage: 3,
    sizingMethod: 'Percentage of Wallet\'s Trade',
    percentageToCopy: 100,
    userId: req.user.userId
  };
  
  const strategy = await strategyService.createStrategy(quickStrategyData, req.user.userId);
  
  res.json(strategy);
});
```

## Copy Trading Mekanizması

### Signal Processing Flow

```javascript
// 1. Wallet Monitoring
async function monitorWallet(walletAddress) {
  // Zerion API'den wallet verilerini çek
  const portfolioData = await zerionService.getPerformancePreview(walletAddress);
  
  // Trade sinyallerini analiz et
  const signals = await analyzePortfolioChanges(portfolioData);
  
  // Sinyalleri process et
  for (const signal of signals) {
    await processTradingSignal(signal);
  }
}

// 2. Signal Processing
async function processTradingSignal(signal) {
  // Strateji configuration'ını kontrol et
  const strategy = await getStrategy(signal.walletAddress);
  
  // Risk management
  if (!passesRiskManagement(signal, strategy)) {
    return; // Signal'i ignore et
  }
  
  // Position hesapla
  const positionSize = calculatePositionSize(signal, strategy);
  
  // Trade'i execute et
  const result = await executeTrade(signal, positionSize);
  
  // Log the execution
  await logExecution(result);
}

// 3. Copy Modes
const COPY_MODES = {
  MIRROR: 'Aynı trade'i kopyala',
  REVERSE: 'Ters trade'i yap',
  PERCENTAGE: 'Yüzde olarak kopyala'
};
```

## External API Entegrasyonları

### Zerion API Entegrasyonu

```javascript
// Wallet Analytics Service
class ZerionService {
  async getPerformancePreview(walletAddress) {
    const response = await axios.get(
      `https://api.zerion.io/v1/wallets/${walletAddress}/positions/`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );
    
    return this.transformPortfolioData(response.data);
  }
  
  transformPortfolioData(data) {
    // API response'u iç formata dönüştür
    return {
      totalValue: data.attributes.total_value_usd,
      positions: data.data.map(position => ({
        token: position.attributes.fungible_info.symbol,
        amount: position.attributes.quantity.float,
        value: position.attributes.value_usd
      }))
    };
  }
}
```

### OKX Trading API Entegrasyonu

```javascript
// OKX Trading Client
class OKXClient {
  async placeMarketOrder(order) {
    const signedRequest = this.signRequest({
      instId: order.instId,
      tdMode: 'cross',
      side: order.side,
      ordType: 'market',
      sz: order.size
    });
    
    const response = await axios.post(
      '/api/v5/trade/order',
      signedRequest,
      { headers: this.getHeaders() }
    );
    
    return response.data;
  }
  
  // Position Management
  async getPositions(instType = 'SWAP') {
    const response = await axios.get(
      '/api/v5/account/positions',
      { 
        params: { instType },
        headers: this.getHeaders()
      }
    );
    
    return response.data.data;
  }
}
```

## Audit ve Logging Sistemi

### Audit Log Mimarisi

```javascript
// Audit Log Service
class AuditLogService {
  async logAction(auditData) {
    const logEntry = {
      entityType: auditData.entityType,
      entityId: auditData.entityId,
      action: auditData.action,
      userId: auditData.userId,
      userRole: auditData.userRole,
      oldValues: auditData.oldValues,
      newValues: auditData.newValues,
      ipAddress: auditData.ipAddress,
      userAgent: auditData.userAgent,
      status: auditData.status || 'SUCCESS',
      description: auditData.description,
      metadata: auditData.metadata,
      timestamp: new Date()
    };
    
    await prisma.auditLog.create({ data: logEntry });
  }
  
  async getAuditLogs(filters, limit = 50, offset = 0) {
    const where = {};
    
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {
        gte: filters.dateFrom,
        lte: filters.dateTo
      };
    }
    
    return await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });
  }
}
```

## Docker Containerization Yapısı

### Docker Compose Konfigürasyonu

```yaml
version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://zenith_user:zenith_password@postgres:5432/zenith_trader_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./src:/usr/src/app/src
    networks:
      - zenith-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: zenith_trader_db
      POSTGRES_USER: zenith_user
      POSTGRES_PASSWORD: zenith_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - zenith-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - zenith-network

networks:
  zenith-network:
    driver: bridge

volumes:
  postgres_data:
```

### Multi-Stage Docker Build

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src ./src
EXPOSE 3001
CMD ["node", "server.js"]
```

## Environment Management

### Environment Değişkenleri

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
POSTGRES_DB=zenith_trader_db
POSTGRES_USER=zenith_user
POSTGRES_PASSWORD=zenith_password
DATABASE_URL=postgresql://zenith_user:zenith_password@postgres:5432/zenith_trader_db

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_TTL_SECONDS=300

# Security Configuration
JWT_SECRET=super_secret_jwt_key_minimum_32_characters
SESSION_SECRET=super_secret_session_key_minimum_32_characters
ENCRYPTION_KEY=super_secret_encryption_key_minimum_32_characters

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# API Keys
ZERION_API_KEY=your_zerion_api_key
OKX_API_KEY=your_okx_api_key
OKX_API_SECRET=your_okx_api_secret
OKX_PASSPHRASE=your_okx_passphrase

# Email Configuration
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

## Hata Ayıklama ve Test Senaryoları

### Karşılaşılan Sorunlar ve Çözümleri

#### 1. JWT Token Parsing Sorunu

**Sorun:** Authentication middleware'de JWT token'ı parse ederken hata oluşuyordu.

**Neden:** Frontend'den gelen token'da `id` field'ı varken, backend `userId` field'ını bekliyordu.

**Çözüm:**
```javascript
// src/middleware/auth.js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const userId = decoded.userId || decoded.id; // Handle both formats
```

#### 2. Database Constraint Sorunu

**Sorun:** "Unique constraint failed on the fields: (`walletAddress`)" hatası.

**Neden:** Database'de global unique constraint varken, farklı kullanıcılar aynı wallet address'i kullanamıyordu.

**Çözüm:**
```prisma
// prisma/schema.prisma
model Strategy {
  walletAddress String
  userId Int
  // ... diğer alanlar
  @@unique([userId, walletAddress]) // Compound unique constraint
}
```

#### 3. Validation Schema Eksikliği

**Sorun:** Strategy validation'da "Invalid copy mode" hatası.

**Neden:** Validation schema'da `copyMode` için yanlış enum değerleri tanımlanmıştı.

**Çözüm:**
```javascript
// src/validation/strategyValidation.js
copyMode: z.enum(['MIRROR', 'REVERSE', 'PERCENTAGE'], {
  errorMap: () => ({ message: 'Invalid copy mode' })
})
```

#### 4. Quick Strategy Endpoint Sorunu

**Sorun:** Hızlı strateji oluştururken "Wallet address already in use" hatası.

**Neden:** Quick strategy endpoint'te wallet address kontrolü global olarak yapılıyordu.

**Çözüm:**
```javascript
// src/api/routes.js
const existingStrategy = await prisma.strategy.findFirst({
  where: { 
    walletAddress,
    userId: req.user.userId // Per-user check
  }
});
```

## Testing ve Quality Assurance

### Test Kategorileri

1. **Unit Tests**: Individual fonksiyonları test etme
2. **Integration Tests**: API endpoint'lerini test etme
3. **Database Tests**: Database işlemlerini test etme
4. **E2E Tests**: Complete user flow'ları test etme

### Test Script'leri

```javascript
// Strategy Creation Test
async function testStrategyCreation() {
  const testStrategy = {
    name: 'Test Strategy',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    exchange: 'OKX',
    copyMode: 'MIRROR',
    leverage: 5,
    positionSize: 100
  };
  
  // Without authentication (should fail)
  const response1 = await axios.post('/api/strategies', testStrategy);
  assert(response1.status === 401);
  
  // With authentication (should succeed)
  const response2 = await axios.post('/api/strategies', testStrategy, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(response2.status === 201);
}
```

## Deployment ve Monitoring

### Deployment Pipeline

1. **Development**: Local Docker development
2. **Staging**: Test environment
3. **Production**: Live environment

### Monitoring ve Logging

```javascript
// Structured Logging
const logger = {
  info: (message, context) => {
    console.log(JSON.stringify({
      timestamp: new Date(),
      level: 'info',
      message,
      context,
      service: 'zenith-trader'
    }));
  },
  
  error: (message, error, context) => {
    console.error(JSON.stringify({
      timestamp: new Date(),
      level: 'error',
      message,
      error: error.message,
      stack: error.stack,
      context,
      service: 'zenith-trader'
    }));
  }
};
```

## Güvenlik Önlemleri

### Authentication ve Authorization

1. **JWT Tokens**: Secure token generation and validation
2. **Password Hashing**: bcrypt ile password hashing
3. **Role-Based Access**: Farklı kullanıcı rolleri için farklı yetkiler
4. **Session Management**: Secure session cookies

### Data Security

1. **Encryption**: Sensitive verilerin şifrelenmesi
2. **Input Validation**: Tüm input'ların validation'ı
3. **SQL Injection Prevention**: Prisma ORM ile otomatik koruma
4. **CORS Configuration**: Güvenli CORS ayarları

### API Security

1. **Rate Limiting**: Request limitleri
2. **Input Sanitization**: Zararlı input'ların temizlenmesi
3. **Error Handling**: Hata mesajlarında bilgi sızıntısını önleme
4. **HTTPS**: Production'da HTTPS zorunluluğu

## Performans Optimizasyonu

### Database Optimizasyonu

```prisma
// Index'ler
model Strategy {
  @@index([userId])
  @@index([userId, createdAt(sort: Desc)])
  @@index([walletAddress, timestamp])
}

// Query Optimizasyonu
const strategies = await prisma.strategy.findMany({
  where: { userId: req.user.userId },
  include: {
    _count: {
      select: { executions: true }
    }
  },
  orderBy: { createdAt: 'desc' }
});
```

### Caching Stratejisi

```javascript
// Redis Cache Implementation
class CacheService {
  async get(key) {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key, value, ttl = 300) {
    await redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async invalidate(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

## Gelecek Planları ve Öneriler

### Kısa Vadeli Hedefler

1. **Real-time Notifications**: Socket.io ile real-time bildirimler
2. **Mobile App**: React Native mobil uygulama
3. **Advanced Analytics**: Detaylı analitik ve reporting
4. **Backtesting**: Strateji backtesting özelliği

### Uzun Vadeli Hedefler

1. **Multi-Exchange Support**: Daha fazla borsa entegrasyonu
2. **AI/ML Features**: Makine öğrenmesi tabanlı trading sinyalleri
3. **Social Features**: Trader sosyal ağı özellikleri
4. **Advanced Risk Management**: Gelişmiş risk yönetimi

## Sonuç

Zenith Trader, modern bir copy trading platformu olup, kapsamlı bir feature setine sahiptir. Proje, güvenilir bir teknoloji stack'i üzerine kurulmuş olup, ölçeklenebilir ve güvenli bir mimariye sahiptir. Karşılaşılan sorunlar sistematik bir şekilde çözülmüş olup, platform stabil bir şekilde çalışmaktadır.

Bu dokümantasyon, projenin teknik detaylarını, mimari yapısını ve karşılaşılan sorunların çözümlerini kapsamlı bir şekilde açıklamaktadır. Bu bilgi, bir AI agent'ın projeyi anlaması ve potansiyel sorunları çözmesi için yeterli detayı sağlamaktadır.