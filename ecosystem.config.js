module.exports = {
  apps: [{
    name: 'zenith-trader-backend',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto-restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Strategy engine specific settings
    cron_restart: '0 0 * * *', // Restart daily at midnight
    
    // Health monitoring
    events: true,
    
    // Error handling
    error_callback: function(err) {
      console.error('PM2 Error:', err);
    }
  }]
};
