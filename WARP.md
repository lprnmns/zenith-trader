# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Zenith Trader is a sophisticated copy trading and wallet analytics platform that monitors blockchain wallets and automatically copies their trades on cryptocurrency exchanges. The system consists of a Node.js backend with Express.js, a React TypeScript frontend with PWA capabilities, and integrations with multiple blockchain and trading APIs.

### Core Architecture

**Backend (Node.js/Express)**
- **Server Entry**: `server.js` - Main application server with middleware configuration
- **Database**: PostgreSQL with Prisma ORM (`prisma/schema.prisma`)
- **API Structure**: RESTful APIs in `src/api/` with role-based access control
- **Core Services**: Strategy engine, alpha finder, notification system in `src/core/` and `src/services/`
- **Background Workers**: Automated analysis and copy trading in `src/workers/`

**Frontend (React + TypeScript)**
- **Location**: `frontend/project/` directory
- **Build Tool**: Vite with TypeScript configuration
- **UI Framework**: React 18 with Shadcn/UI components and Tailwind CSS
- **PWA Features**: Service worker for offline capabilities and push notifications

**Database Design**
- **Users**: Role-based (ADMIN/USER) with Google OAuth integration
- **Strategies**: Copy trading configurations with OKX API credentials
- **Trading Signals**: Position detection and execution tracking
- **Notifications**: User wallet subscriptions and push notification support

## Development Commands

### Environment Setup
```bash
# Install dependencies (run in root and frontend)
npm install
cd frontend/project && npm install

# Environment configuration
cp .env.example .env  # Configure with real API keys
```

### Database Management
```bash
# Start PostgreSQL via Docker
make up  # or docker-compose -f docker-compose.dev.yml up -d

# Database operations
npx prisma migrate dev          # Run pending migrations
npx prisma db push             # Push schema changes without migration
npx prisma generate            # Regenerate Prisma client
npm run seed                   # Seed initial data (includes admin user)
npx prisma studio             # Open database browser
```

### Development Servers
```bash
# Backend (runs on port 3001)
npm run dev                   # Uses nodemon for auto-restart

# Frontend (runs on port 5173)
cd frontend/project && npm run dev

# Full stack development
make dev-start                # Starts both backend and frontend
```

### Testing
```bash
# Backend tests
npm test                      # Run Jest unit tests
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage report

# Frontend tests  
cd frontend/project
npm test                     # Run Vitest tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
npm run test:e2e            # Run Playwright E2E tests

# Run all tests
npm run test:ci             # Backend + Frontend + E2E
```

### Build and Deployment
```bash
# Frontend build
cd frontend/project && npm run build

# Docker operations
make up                     # Start development environment
make down                   # Stop all services
make db-reset              # Reset database (WARNING: deletes data)

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

## Key Technical Concepts

### Copy Trading System
The core feature automatically copies trades from monitored wallets to OKX futures:
- **Signal Detection**: Analyzes Position Ledger data from Zerion API to detect new positions
- **Trade Execution**: Maps tokens (WETH→ETH) and executes via OKX API with configurable leverage
- **Risk Management**: 10% equity allocation per trade, 3x leverage for longs, 1x for shorts
- **Position Tracking**: Stores execution history in `StrategyExecution` and `PositionSignal` tables

### Authentication & Authorization
- **Google OAuth**: Primary authentication method with session management
- **Role-Based Access**: `ADMIN` users can configure copy trading, `USER` role for wallet analytics only
- **API Security**: JWT tokens with 24-hour sessions, encrypted storage of exchange API keys

### Real-time Features
- **Background Processing**: Strategy engine runs every 5 minutes via `src/core/strategyEngine.js`
- **WebSocket**: Real-time updates for trade executions and position changes
- **PWA Notifications**: Push notifications for wallet movements using VAPID keys

### External Integrations
- **Zerion API**: Primary source for wallet analytics and position data
- **Etherscan API**: Fallback for blockchain transaction data
- **OKX API**: Futures trading execution (supports demo mode)
- **Coingecko API**: Token price data fallback

## File Structure Highlights

### Critical Backend Files
- `server.js` - Application entry point and middleware setup
- `src/core/strategyEngine.js` - Core copy trading logic
- `src/api/routes/` - API endpoint definitions
- `src/services/` - External API integrations and business logic
- `prisma/schema.prisma` - Database schema with all models

### Critical Frontend Files
- `frontend/project/src/` - React application source
- `frontend/project/vite.config.ts` - Build configuration with PWA plugin
- `frontend/project/public/sw.js` - Service worker for PWA features

### Configuration Files
- `.env.example` - Comprehensive environment variable template
- `Makefile` - Development workflow commands
- `docker-compose*.yml` - Various deployment configurations
- `ecosystem.config.js` - PM2 process management for production

## Development Workflow

### Adding New Features
1. **Database Changes**: Update `prisma/schema.prisma` → run `npx prisma migrate dev`
2. **Backend APIs**: Add routes in `src/api/` with appropriate middleware
3. **Frontend Components**: Add to `frontend/project/src/components/`
4. **Testing**: Add unit tests and update E2E test coverage

### Working with Copy Trading
- **Test Mode**: Set `OKX_DEMO_MODE=1` in `.env` for safe testing
- **Signal Testing**: Use scripts like `test_real_signals.js` to test position detection
- **Token Mapping**: Configure in copy trading service for unsupported tokens

### Debugging Common Issues
- **Port Conflicts**: Backend uses 3001, frontend 5173, database 5432
- **Database Locks**: Use `make db-reset` to clear PostgreSQL advisory locks
- **CORS Issues**: Check `corsOptions` in `server.js` for allowed origins
- **PWA Issues**: Verify VAPID keys are set for push notifications

## Environment Requirements

### Required Environment Variables
- Database: `DATABASE_URL`
- Authentication: `JWT_SECRET`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID/SECRET`
- Trading: `OKX_API_KEY/SECRET/PASSPHRASE` (can use demo mode)
- Analytics: `ZERION_API_KEY`, `ETHERSCAN_API_KEY`
- PWA: `VAPID_PUBLIC_KEY/PRIVATE_KEY`

### Development Dependencies
- Node.js 18+
- Docker Desktop (for PostgreSQL)
- PostgreSQL client (for direct database access)

This codebase implements a production-ready copy trading platform with comprehensive testing, Docker deployment, and PWA capabilities. The modular architecture allows for easy extension to support additional exchanges and blockchain networks.
