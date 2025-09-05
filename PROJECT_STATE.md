# 🚀 ZENITH TRADER - PROJECT STATE DOCUMENTATION

## 📌 Project Identity
- **Name**: Zenith Trader
- **Type**: Crypto Whale Copy Trading Platform (PWA)
- **Version**: 1.0.0 (In Development)
- **Repository**: D:\projeler\zenith-trader

## 🏗️ Architecture Overview

### Backend Structure
```
src/
├── api/           # API routes
├── config/        # Configuration files
├── core/          # Core business logic
│   └── strategyEngine.js
├── routes/        # Express routes
│   ├── admin.js
│   ├── health.js
│   └── notifications.js
├── services/      # Service layer
│   ├── analysisService.js
│   ├── authService.js
│   ├── copyTradingService.js
│   ├── etherscanService.js
│   ├── notificationService.js
│   ├── okxService.js
│   ├── positionSignalService.js
│   └── zerionService.js
└── workers/       # Background workers
    └── alphaFinder.js
```

### Frontend Structure
```
frontend/project/src/
├── components/    # React components
├── hooks/         # Custom hooks
├── lib/           # Utilities
├── pages/         # Page components
├── services/      # API services
└── stores/        # State management
```

### Database Schema (Current)
```prisma
- User (id, email, password, role, createdAt, updatedAt)
- Strategy (id, name, walletAddress, okxApiKey, etc.)
- Trade (id, strategyId, action, token, amount, status)
- WatchedWallet (id, address, userId)
- SuggestedWallet (id, address, name, riskLevel, PnL metrics)
- CopyTradingConfig (id, okxApiKey, okxSecretKey, isActive)
- PositionSignal (id, walletAddress, signalType, token, amount)
- CopyTrade (id, signalId, okxOrderId, status)
- UserSubscription (id, userId, endpoint, p256dh, auth)
```

## 🔧 Current Implementation Status

### ✅ Completed Features
1. **Database Setup**
   - PostgreSQL with Prisma ORM
   - All base tables created
   - Migrations up to date

2. **Basic Authentication**
   - JWT-based authentication
   - Login/Register endpoints
   - Password hashing with bcrypt

3. **Wallet Analysis**
   - Zerion API integration
   - Wallet tracking system
   - Position ledger analysis

4. **OKX Integration**
   - Basic API service
   - Demo mode support

5. **Frontend Base**
   - React + TypeScript setup
   - Tailwind + Shadcn/UI
   - Basic routing

### 🚧 In Development
1. **RBAC System** - Role-based access control
2. **Google OAuth** - Replace manual login
3. **Copy Trading Engine** - Full implementation
4. **PWA Features** - Offline support, push notifications

### ❌ Not Started
1. Production deployment setup
2. CI/CD pipeline
3. Test coverage
4. Monitoring and logging

## 🔑 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://zenith:password@localhost:5432/zenith_trader_db

# APIs
ZERION_API_KEY=zk_dev_xxxxx
ETHERSCAN_API_KEY=xxxxx
OKX_API_KEY=xxxxx
OKX_API_SECRET=xxxxx
OKX_API_PASSPHRASE=xxxxx
OKX_DEMO_MODE=1

# Auth
JWT_SECRET=xxxxx
SESSION_SECRET=(to be added)

# OAuth (to be added)
GOOGLE_CLIENT_ID=(pending)
GOOGLE_CLIENT_SECRET=(pending)

# PWA
VAPID_PUBLIC_KEY=xxxxx
VAPID_PRIVATE_KEY=xxxxx
VAPID_CONTACT_EMAIL=admin@zenithtrader.com
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_PUSH_PUBLIC_KEY=(to be added)
```

## 🐳 Docker Configuration
- **docker-compose.yml**: Main compose file
- **Services**: PostgreSQL, Redis, App, Nginx
- **Volumes**: postgres_data, redis_data
- **Network**: zenith_network

## 📦 Dependencies

### Backend Main Dependencies
- @prisma/client: ^6.14.0
- express: ^5.1.0
- axios: ^1.11.0
- bcryptjs: ^3.0.2
- jsonwebtoken: ^9.0.2
- okx-api: ^3.0.4
- redis: ^5.8.2
- web-push: ^3.6.7

### Frontend Main Dependencies
- react: ^18.3.1
- react-router-dom: ^7.8.2
- @radix-ui/react-*: Various UI components
- axios: ^1.11.0
- tailwindcss: ^3.4.13
- vite: ^5.4.8
- zod: ^3.25.76
- zustand: ^5.0.8

## 🚦 Server Configuration
- **Backend Port**: 3001 (configurable)
- **Frontend Port**: 5173 (Vite default)
- **Database Port**: 5432
- **Redis Port**: 6379

## 📝 Important Notes

### Security Considerations
1. JWT secret needs rotation for production
2. API keys are in plain text in .env (needs encryption)
3. No rate limiting implemented yet
4. CORS is wide open (needs restriction)

### Performance Considerations
1. No caching layer implemented
2. Database indexes need optimization
3. No connection pooling configured
4. Frontend bundle not optimized

### Known Technical Debt
1. No error boundary in React app
2. Console.log statements throughout code
3. No proper logging system
4. Migration lock issues possible
5. Hardcoded values in some places

## 🎯 Business Logic

### Copy Trading Flow
1. Monitor wallet via Zerion API
2. Detect position changes
3. Map tokens to OKX symbols
4. Calculate position size based on strategy
5. Execute trade on OKX
6. Record execution in database
7. Send notification if enabled

### User Roles
- **Admin**: Full access, can create strategies
- **User**: Read-only access to wallet explorer

### Strategy Parameters
- Mode: Spot/Futures
- Leverage: 1-20x
- Position Size: % of equity
- Allowed Tokens: Whitelist
- Max Open Positions: Limit

## 🔄 Migration History
1. 20250825095739_init_strategy
2. 20250826070404_add_suggested_wallets
3. 20250826195416_add_suggestion_engine
4. 20250826202416_add_trades_table
5. 20250826204439_update_suggested_wallets_metrics
6. 20250827120114_add_suggested_total_value
7. 20250829224309_add_user_auth_system
8. 20250831200229_add_copy_trading_tables
9. 20250831210001_add_user_subscriptions

## 🐛 Current Issues
1. Admin email hardcoded as admin@gmail.com
2. Migration locks may occur on repeated runs
3. Docker compose lacks health checks
4. No graceful shutdown handling
5. Frontend has demo/test UI elements
