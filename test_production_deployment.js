const { PrismaClient } = require('@prisma/client');
// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

const prisma = new PrismaClient();

async function testProductionDeployment() {
  console.log('🏭 Production Deployment Test Başlıyor...\n');

  try {
    const results = {};

    // 1. Environment check
    console.log('1️⃣ Environment Check...');
    
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'ETHERSCAN_API_KEY',
      'ZERION_API_KEY',
      'VAPID_PUBLIC_KEY',
      'VAPID_PRIVATE_KEY',
      'ENCRYPTION_KEY',
      'ENCRYPTION_IV'
    ];

    const envCheck = {};
    for (const envVar of requiredEnvVars) {
      envCheck[envVar] = process.env[envVar] ? 'configured' : 'missing';
    }

    results.environment = envCheck;
    
    const missingVars = Object.values(envCheck).filter(status => status === 'missing');
    if (missingVars.length > 0) {
      console.log('❌ Missing environment variables:', missingVars);
    } else {
      console.log('✅ All required environment variables are configured');
    }

    // 2. Database connectivity test
    console.log('\n2️⃣ Database Connectivity Test...');
    
    try {
      await prisma.$connect();
      const dbVersion = await prisma.$queryRaw`SELECT version()`;
      results.database = {
        status: 'connected',
        version: dbVersion[0].version.split(' ')[0]
      };
      console.log('✅ Database connected successfully');
    } catch (error) {
      results.database = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Database connection failed:', error.message);
    }

    // 3. Health check endpoint test
    console.log('\n3️⃣ Health Check Endpoint Test...');
    
    try {
      const healthResponse = await fetch('http://localhost:3000/health');
      const healthData = await healthResponse.json();
      
      results.healthCheck = {
        status: healthResponse.status,
        data: healthData
      };
      
      if (healthResponse.ok) {
        console.log('✅ Health check endpoint is working');
        console.log('   Status:', healthData.status);
        console.log('   Uptime:', Math.round(healthData.uptime), 'seconds');
      } else {
        console.log('❌ Health check failed with status:', healthResponse.status);
      }
    } catch (error) {
      results.healthCheck = {
        status: 'error',
        error: error.message
      };
      console.log('❌ Health check endpoint error:', error.message);
    }

    // 4. Metrics endpoint test
    console.log('\n4️⃣ Metrics Endpoint Test...');
    
    try {
      const metricsResponse = await fetch('http://localhost:3000/metrics');
      const metricsData = await metricsResponse.text();
      
      results.metrics = {
        status: metricsResponse.status,
        hasData: metricsData.length > 0
      };
      
      if (metricsResponse.ok && metricsData.length > 0) {
        console.log('✅ Metrics endpoint is working');
        console.log('   Data length:', metricsData.length, 'characters');
      } else {
        console.log('❌ Metrics endpoint failed');
      }
    } catch (error) {
      results.metrics = {
        status: 'error',
        error: error.message
      };
      console.log('❌ Metrics endpoint error:', error.message);
    }

    // 5. API endpoints test
    console.log('\n5️⃣ API Endpoints Test...');
    
    const apiEndpoints = [
      '/api/admin/copy-trading/status',
      '/api/notifications/vapid-public-key',
      '/api/wallet/analyze'
    ];

    results.apiEndpoints = {};
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        results.apiEndpoints[endpoint] = {
          status: response.status,
          accessible: response.status !== 404
        };
        
        if (response.status !== 404) {
          console.log(`✅ ${endpoint}: ${response.status}`);
        } else {
          console.log(`❌ ${endpoint}: 404 Not Found`);
        }
      } catch (error) {
        results.apiEndpoints[endpoint] = {
          status: 'error',
          error: error.message
        };
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }

    // 6. Database schema test
    console.log('\n6️⃣ Database Schema Test...');
    
    try {
      const tables = [
        'users',
        'user_subscriptions',
        'user_wallet_notifications',
        'copy_trading_configs',
        'position_signals',
        'copy_trades'
      ];

      results.databaseSchema = {};
      
      for (const table of tables) {
        try {
          const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ${table}`;
          results.databaseSchema[table] = {
            exists: true,
            recordCount: count[0].count
          };
          console.log(`✅ ${table}: ${count[0].count} records`);
        } catch (error) {
          results.databaseSchema[table] = {
            exists: false,
            error: error.message
          };
          console.log(`❌ ${table}: Table not found`);
        }
      }
    } catch (error) {
      results.databaseSchema = {
        error: error.message
      };
      console.log('❌ Database schema test failed:', error.message);
    }

    // 7. Copy Trading Engine test
    console.log('\n7️⃣ Copy Trading Engine Test...');
    
    try {
      const CopyTradingEngine = require('./src/core/copyTradingEngine');
      const engine = new CopyTradingEngine();
      const engineStatus = engine.getStatus();
      
      results.copyTradingEngine = {
        status: 'available',
        isRunning: engineStatus.isRunning,
        activeWalletCount: engineStatus.activeWalletCount,
        lastScanTime: engineStatus.lastScanTime
      };
      
      console.log('✅ Copy Trading Engine is available');
      console.log('   Running:', engineStatus.isRunning);
      console.log('   Active wallets:', engineStatus.activeWalletCount);
    } catch (error) {
      results.copyTradingEngine = {
        status: 'error',
        error: error.message
      };
      console.log('❌ Copy Trading Engine test failed:', error.message);
    }

    // 8. Notification Service test
    console.log('\n8️⃣ Notification Service Test...');
    
    try {
      const notificationService = require('./src/services/notificationService');
      const vapidKey = notificationService.getVapidPublicKey();
      
      results.notificationService = {
        status: 'available',
        hasVapidKey: !!vapidKey
      };
      
      console.log('✅ Notification Service is available');
      console.log('   VAPID Key:', vapidKey ? 'Configured' : 'Missing');
    } catch (error) {
      results.notificationService = {
        status: 'error',
        error: error.message
      };
      console.log('❌ Notification Service test failed:', error.message);
    }

    // 9. Performance test
    console.log('\n9️⃣ Performance Test...');
    
    const startTime = Date.now();
    
    // Test database query performance
    const dbStartTime = Date.now();
    await prisma.user.findMany({ take: 10 });
    const dbEndTime = Date.now();
    
    // Test health check response time
    const healthStartTime = Date.now();
    await fetch('http://localhost:3000/health');
    const healthEndTime = Date.now();
    
    results.performance = {
      databaseQueryTime: dbEndTime - dbStartTime,
      healthCheckTime: healthEndTime - healthStartTime,
      totalTestTime: Date.now() - startTime
    };
    
    console.log('✅ Performance test completed');
    console.log('   Database query:', results.performance.databaseQueryTime, 'ms');
    console.log('   Health check:', results.performance.healthCheckTime, 'ms');
    console.log('   Total test time:', results.performance.totalTestTime, 'ms');

    // 10. Security test
    console.log('\n🔟 Security Test...');
    
    const securityChecks = {
      hasJwtSecret: !!process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-super-secure-jwt-secret-key-here',
      hasEncryptionKey: !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY !== 'your-32-character-encryption-key',
      hasVapidKeys: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      isProduction: process.env.NODE_ENV === 'production'
    };
    
    results.security = securityChecks;
    
    const securityScore = Object.values(securityChecks).filter(Boolean).length;
    const totalSecurityChecks = Object.keys(securityChecks).length;
    
    console.log('✅ Security test completed');
    console.log('   Security score:', `${securityScore}/${totalSecurityChecks}`);
    console.log('   JWT Secret:', securityChecks.hasJwtSecret ? 'Configured' : 'Default');
    console.log('   Encryption Key:', securityChecks.hasEncryptionKey ? 'Configured' : 'Default');
    console.log('   VAPID Keys:', securityChecks.hasVapidKeys ? 'Configured' : 'Missing');
    console.log('   Environment:', securityChecks.isProduction ? 'Production' : 'Development');

    // 11. Summary
    console.log('\n1️⃣1️⃣ Production Deployment Summary...');
    
    const summary = {
      environment: Object.values(results.environment).filter(status => status === 'configured').length,
      database: results.database.status === 'connected',
      healthCheck: results.healthCheck.status === 200,
      metrics: results.metrics.status === 200,
      apiEndpoints: Object.values(results.apiEndpoints).filter(ep => ep.accessible).length,
      databaseSchema: Object.values(results.databaseSchema).filter(table => table.exists).length,
      copyTradingEngine: results.copyTradingEngine.status === 'available',
      notificationService: results.notificationService.status === 'available',
      security: securityScore
    };

    const totalChecks = Object.keys(summary).length;
    const passedChecks = Object.values(summary).filter(Boolean).length;
    const deploymentScore = (passedChecks / totalChecks) * 100;

    console.log('📊 Deployment Score:', `${deploymentScore.toFixed(1)}% (${passedChecks}/${totalChecks})`);
    
    console.log('\n📋 Detailed Results:');
    Object.entries(summary).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
    });

    if (deploymentScore >= 90) {
      console.log('\n🎉 Production deployment is ready!');
    } else if (deploymentScore >= 70) {
      console.log('\n⚠️ Production deployment needs attention. Some components need configuration.');
    } else {
      console.log('\n❌ Production deployment is not ready. Multiple issues need to be resolved.');
    }

    console.log('\n🏭 Production Deployment Test Tamamlandı!');

  } catch (error) {
    console.error('❌ Production deployment test error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testProductionDeployment();
