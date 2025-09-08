const { PrismaClient } = require('@prisma/client');

// Test database setup
beforeAll(async () => {
  // Use a separate test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  
  // Create test database if it doesn't exist
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    console.log('⚠️  Running tests without database connection');
    // Don't exit, just continue without database
  }
  
  await prisma.$disconnect();
});

// Clean up database after each test
afterEach(async () => {
  const prisma = new PrismaClient();
  
  try {
    // Delete all data in correct order to respect foreign keys
    await prisma.auditLog.deleteMany();
    await prisma.strategyExecution.deleteMany();
    await prisma.tradingSignal.deleteMany();
    await prisma.walletEvent.deleteMany();
    await prisma.strategy.deleteMany();
    await prisma.pushSubscription.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('🧹 Database cleaned');
  } catch (error) {
    // Silently continue if database is not available
  }
  
  await prisma.$disconnect();
});

// Close database connection after all tests
afterAll(async () => {
  const prisma = new PrismaClient();
  try {
    await prisma.$disconnect();
    console.log('✅ Test database disconnected');
  } catch (error) {
    // Silently continue if database is not available
  }
});

// Global test timeout
jest.setTimeout(30000);

// Mock external services
jest.mock('../src/services/zerionService', () => ({
  getWalletTransactions: jest.fn(),
  getWalletPositions: jest.fn(),
}));

jest.mock('../src/services/okxService', () => ({
  placeOrder: jest.fn(),
  getPositions: jest.fn(),
  getAccountBalance: jest.fn(),
}));

// Suppress console errors during tests
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});