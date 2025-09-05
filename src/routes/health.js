const express = require('express');
const { PrismaClient } = require('@prisma/client');
const redis = require('redis');

const router = express.Router();
const prisma = new PrismaClient();

// Redis client
let redisClient = null;
if (process.env.REDIS_URL) {
    redisClient = redis.createClient({
        url: process.env.REDIS_URL
    });
}

// Health check endpoint
router.get('/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        checks: {}
    };

    try {
        // Database health check
        try {
            await prisma.$queryRaw`SELECT 1`;
            health.checks.database = {
                status: 'healthy',
                responseTime: Date.now()
            };
        } catch (error) {
            health.checks.database = {
                status: 'unhealthy',
                error: error.message
            };
            health.status = 'unhealthy';
        }

        // Redis health check
        if (redisClient) {
            try {
                const startTime = Date.now();
                await redisClient.ping();
                health.checks.redis = {
                    status: 'healthy',
                    responseTime: Date.now() - startTime
                };
            } catch (error) {
                health.checks.redis = {
                    status: 'unhealthy',
                    error: error.message
                };
                health.status = 'unhealthy';
            }
        }

        // Memory usage
        const memUsage = process.memoryUsage();
        health.checks.memory = {
            status: 'healthy',
            rss: Math.round(memUsage.rss / 1024 / 1024), // MB
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) // MB
        };

        // CPU usage
        const cpuUsage = process.cpuUsage();
        health.checks.cpu = {
            status: 'healthy',
            user: cpuUsage.user,
            system: cpuUsage.system
        };

        // Copy Trading Engine status
        try {
            const CopyTradingEngine = require('../core/copyTradingEngine');
            const engine = new CopyTradingEngine();
            const engineStatus = engine.getStatus();
            
            health.checks.copyTradingEngine = {
                status: engineStatus.isRunning ? 'running' : 'stopped',
                isRunning: engineStatus.isRunning,
                activeWalletCount: engineStatus.activeWalletCount,
                lastScanTime: engineStatus.lastScanTime
            };
        } catch (error) {
            health.checks.copyTradingEngine = {
                status: 'error',
                error: error.message
            };
        }

        // API endpoints health check
        health.checks.externalApis = {
            etherscan: 'unknown',
            zerion: 'unknown',
            okx: 'unknown'
        };

        // Set appropriate status code
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);

    } catch (error) {
        health.status = 'unhealthy';
        health.error = error.message;
        res.status(503).json(health);
    }
});

// Detailed health check
router.get('/health/detailed', async (req, res) => {
    const detailedHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        system: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            pid: process.pid
        },
        checks: {}
    };

    try {
        // Database detailed check
        try {
            const startTime = Date.now();
            const result = await prisma.$queryRaw`SELECT version()`;
            const responseTime = Date.now() - startTime;
            
            detailedHealth.checks.database = {
                status: 'healthy',
                responseTime,
                version: result[0].version,
                connectionPool: {
                    active: await prisma.$metrics.json().then(m => m.connectionPool.active),
                    idle: await prisma.$metrics.json().then(m => m.connectionPool.idle)
                }
            };
        } catch (error) {
            detailedHealth.checks.database = {
                status: 'unhealthy',
                error: error.message,
                stack: error.stack
            };
            detailedHealth.status = 'unhealthy';
        }

        // Redis detailed check
        if (redisClient) {
            try {
                const startTime = Date.now();
                const info = await redisClient.info();
                const responseTime = Date.now() - startTime;
                
                detailedHealth.checks.redis = {
                    status: 'healthy',
                    responseTime,
                    info: info.split('\n').slice(0, 10) // First 10 lines of info
                };
            } catch (error) {
                detailedHealth.checks.redis = {
                    status: 'unhealthy',
                    error: error.message
                };
                detailedHealth.status = 'unhealthy';
            }
        }

        // Application metrics
        detailedHealth.checks.application = {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            resourceUsage: process.resourceUsage(),
            env: {
                NODE_ENV: process.env.NODE_ENV,
                PORT: process.env.PORT,
                DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not configured',
                REDIS_URL: process.env.REDIS_URL ? 'configured' : 'not configured'
            }
        };

        const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(detailedHealth);

    } catch (error) {
        detailedHealth.status = 'unhealthy';
        detailedHealth.error = error.message;
        detailedHealth.stack = error.stack;
        res.status(503).json(detailedHealth);
    }
});

// Metrics endpoint for Prometheus
router.get('/metrics', async (req, res) => {
    try {
        const metrics = {
            // Application metrics
            zenith_trader_uptime_seconds: process.uptime(),
            zenith_trader_memory_bytes: process.memoryUsage().heapUsed,
            zenith_trader_memory_total_bytes: process.memoryUsage().heapTotal,
            
            // Database metrics
            zenith_trader_database_connections_active: 0,
            zenith_trader_database_connections_idle: 0,
            
            // Custom metrics
            zenith_trader_requests_total: 0,
            zenith_trader_errors_total: 0,
            zenith_trader_wallet_analyses_total: 0,
            zenith_trader_signals_generated_total: 0,
            zenith_trader_trades_executed_total: 0
        };

        // Try to get database metrics
        try {
            const dbMetrics = await prisma.$metrics.json();
            metrics.zenith_trader_database_connections_active = dbMetrics.connectionPool.active;
            metrics.zenith_trader_database_connections_idle = dbMetrics.connectionPool.idle;
        } catch (error) {
            // Database metrics not available
        }

        // Format as Prometheus metrics
        const prometheusMetrics = Object.entries(metrics)
            .map(([key, value]) => `${key} ${value}`)
            .join('\n');

        res.set('Content-Type', 'text/plain');
        res.send(prometheusMetrics);

    } catch (error) {
        res.status(500).send(`# Error collecting metrics: ${error.message}\n`);
    }
});

module.exports = router;
