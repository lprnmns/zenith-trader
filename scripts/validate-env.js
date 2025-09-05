#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * Validates required environment variables and their formats
 */

const requiredEnvVars = {
  // Server Configuration
  NODE_ENV: {
    required: false,
    defaultValue: 'development',
    validValues: ['development', 'staging', 'production'],
    description: 'Application environment'
  },
  PORT: {
    required: false,
    defaultValue: '3001',
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) < 65536,
    description: 'Server port number'
  },

  // Database
  DATABASE_URL: {
    required: true,
    validator: (value) => value.startsWith('postgresql://'),
    description: 'PostgreSQL connection string'
  },

  // Security
  JWT_SECRET: {
    required: true,
    validator: (value) => value.length >= 32,
    description: 'JWT secret (minimum 32 characters)'
  },
  SESSION_SECRET: {
    required: true,
    validator: (value) => value.length >= 32,
    description: 'Session secret (minimum 32 characters)'
  },
  ENCRYPTION_KEY: {
    required: true,
    validator: (value) => value.length >= 32,
    description: 'Encryption key (minimum 32 characters)'
  },

  // Google OAuth
  GOOGLE_CLIENT_ID: {
    required: false, // Will be required when OAuth is implemented
    description: 'Google OAuth client ID'
  },
  GOOGLE_CLIENT_SECRET: {
    required: false, // Will be required when OAuth is implemented
    description: 'Google OAuth client secret'
  },

  // API Keys
  ZERION_API_KEY: {
    required: true,
    validator: (value) => value.startsWith('zk_'),
    description: 'Zerion API key'
  },
  OKX_API_KEY: {
    required: true,
    description: 'OKX API key'
  },
  OKX_API_SECRET: {
    required: true,
    description: 'OKX API secret'
  },
  OKX_API_PASSPHRASE: {
    required: true,
    description: 'OKX API passphrase'
  },

  // PWA
  VAPID_PUBLIC_KEY: {
    required: false,
    description: 'VAPID public key for push notifications'
  },
  VAPID_PRIVATE_KEY: {
    required: false,
    description: 'VAPID private key for push notifications'
  },
  VAPID_CONTACT_EMAIL: {
    required: false,
    validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    description: 'Contact email for VAPID'
  }
};

const optionalEnvVars = {
  REDIS_URL: {
    description: 'Redis connection string'
  },
  ETHERSCAN_API_KEY: {
    description: 'Etherscan API key'
  },
  FRONTEND_URL: {
    defaultValue: 'http://localhost:5173',
    description: 'Frontend URL for OAuth redirects'
  }
};

function validateEnvVar(name, config, value) {
  if (!value || value.trim() === '') {
    if (config.required) {
      return {
        valid: false,
        message: `Missing required environment variable: ${name}`
      };
    } else if (config.defaultValue) {
      return {
        valid: true,
        message: `Using default value for ${name}: ${config.defaultValue}`,
        value: config.defaultValue
      };
    } else {
      return {
        valid: true,
        message: `Optional variable ${name} not set`
      };
    }
  }

  // Check valid values
  if (config.validValues && !config.validValues.includes(value)) {
    return {
      valid: false,
      message: `Invalid value for ${name}. Must be one of: ${config.validValues.join(', ')}`
    };
  }

  // Run custom validator
  if (config.validator && !config.validator(value)) {
    return {
      valid: false,
      message: `Invalid value for ${name}. ${config.description}`
    };
  }

  return {
    valid: true,
    message: `✓ ${name} is valid`,
    value: value
  };
}

function checkEnvironment() {
  console.log('🔍 Validating environment variables...\n');
  
  let hasErrors = false;
  const results = [];

  // Check required variables
  for (const [name, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[name];
    const result = validateEnvVar(name, config, value);
    results.push({ name, ...result });
    
    if (!result.valid) {
      hasErrors = true;
      console.log(`❌ ${result.message}`);
    } else {
      console.log(`✅ ${result.message}`);
    }
  }

  console.log('\n--- Optional Variables ---');
  
  // Check optional variables
  for (const [name, config] of Object.entries(optionalEnvVars)) {
    const value = process.env[name] || config.defaultValue;
    if (value) {
      console.log(`ℹ️  ${name}: ${value}`);
    }
  }

  // Summary
  console.log('\n--- Environment Summary ---');
  console.log(`Node.js version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${process.env.PORT || '3001'}`);
  
  if (hasErrors) {
    console.log('\n❌ Environment validation failed!');
    console.log('Please fix the errors above before starting the application.');
    process.exit(1);
  } else {
    console.log('\n✅ Environment validation passed!');
    
    // Warnings for production
    if (process.env.NODE_ENV === 'production') {
      const warnings = [];
      
      if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
        warnings.push('JWT_SECRET is using default value');
      }
      if (process.env.SESSION_SECRET === 'your-super-secret-session-key-change-this-in-production') {
        warnings.push('SESSION_SECRET is using default value');
      }
      if (process.env.ENCRYPTION_KEY === 'your-super-secret-encryption-key-32-chars-long') {
        warnings.push('ENCRYPTION_KEY is using default value');
      }
      
      if (warnings.length > 0) {
        console.log('\n⚠️  Production warnings:');
        warnings.forEach(warning => console.log(`   - ${warning}`));
      }
    }
  }
}

// Help command
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Environment Variables Validation Script

Usage: node validate-env.js [options]

Options:
  --help, -h     Show this help message
  --list, -l      List all environment variables and descriptions

Environment Variables:
`);
  
  console.log('Required Variables:');
  for (const [name, config] of Object.entries(requiredEnvVars)) {
    console.log(`  ${name}: ${config.description}`);
  }
  
  console.log('\nOptional Variables:');
  for (const [name, config] of Object.entries(optionalEnvVars)) {
    console.log(`  ${name}: ${config.description}`);
  }
  
  process.exit(0);
}

// List command
if (process.argv.includes('--list') || process.argv.includes('-l')) {
  console.log('All Environment Variables:\n');
  
  console.log('Required Variables:');
  for (const [name, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[name];
    const status = value ? '✓' : '✗';
    console.log(`  ${status} ${name}: ${config.description}`);
    if (value) {
      console.log(`     Value: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
    }
  }
  
  console.log('\nOptional Variables:');
  for (const [name, config] of Object.entries(optionalEnvVars)) {
    const value = process.env[name] || config.defaultValue;
    const status = value ? '✓' : '✗';
    console.log(`  ${status} ${name}: ${config.description}`);
    if (value) {
      console.log(`     Value: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
    }
  }
  
  process.exit(0);
}

// Run validation
checkEnvironment();