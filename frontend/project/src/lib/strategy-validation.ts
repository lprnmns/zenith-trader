import { z } from 'zod';

// Strategy validation schema with enhanced rules
export const strategyValidationSchema = z.object({
  // Basic Information
  name: z.string()
    .min(1, 'Strategy name is required')
    .max(50, 'Strategy name is too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Only letters, numbers, spaces, - and _ characters are allowed'),
    
  walletAddress: z.string()
    .min(42, 'Invalid wallet address')
    .max(42, 'Invalid wallet address')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
    
  // Exchange Configuration
  exchange: z.enum(['OKX', 'Binance', 'Bybit'], {
    errorMap: () => ({ message: 'Please select a valid exchange' })
  }),
  
  copyMode: z.enum(['Perpetual', 'Spot'], {
    errorMap: () => ({ message: 'Please select a valid copy mode' })
  }),
  
  // Futures Configuration
  leverage: z.number()
    .min(1, 'Leverage must be 1 or greater')
    .max(125, 'Leverage must be less than 125'),
    
  marginMode: z.enum(['cross', 'isolated'], {
    errorMap: () => ({ message: 'Please select a valid margin mode' })
  }),
  
  // Position Sizing
  sizingMethod: z.enum(['Fixed Amount', 'Percentage of Wallet\'s Trade'], {
    errorMap: () => ({ message: 'Please select a valid position sizing method' })
  }),
  
  positionSize: z.number()
    .min(1, 'Position size must be 1 or greater')
    .max(1000000, 'Position size is too large'),
    
  amountPerTrade: z.number()
    .optional()
    .refine((val) => !val || val >= 1, {
      message: 'Amount per trade must be 1 or greater'
    })
    .refine((val) => !val || val <= 1000000, {
      message: 'Amount per trade is too large'
    }),
    
  percentageToCopy: z.number()
    .optional()
    .refine((val) => !val || (val >= 0 && val <= 100), {
      message: 'Copy percentage must be between 0-100'
    }),
  
  // Risk Management
  stopLoss: z.number()
    .optional()
    .refine((val) => !val || (val >= 0 && val <= 100), {
      message: 'Stop loss must be between 0-100'
    }),
    
  dailyLimit: z.number()
    .optional()
    .refine((val) => !val || val >= 1, {
      message: 'Daily limit must be 1 or greater'
    }),
  
  // Symbol Filters
  allowedTokens: z.array(z.string())
    .default([])
    .refine((tokens) => tokens.length <= 50, {
      message: 'You can add maximum 50 tokens'
    }),
    
  minTradeSize: z.number()
    .optional()
    .refine((val) => !val || val >= 0, {
      message: 'Minimum trade size cannot be negative'
    }),
    
  maxTradeSize: z.number()
    .optional()
    .refine((val) => !val || val >= 0, {
      message: 'Maximum trade size cannot be negative'
    }),
  
  // Execution Settings
  executionDelay: z.number()
    .min(0, 'Delay must be 0 or greater')
    .max(300, 'Delay must be less than 300 seconds')
    .default(0),
    
  maxSlippage: z.number()
    .min(0, 'Slippage must be 0 or greater')
    .max(10, 'Slippage must be less than 10')
    .default(1),
    
  retryAttempts: z.number()
    .min(0, 'Retry attempts must be 0 or greater')
    .max(5, 'Retry attempts must be less than 5')
    .default(3),
  
  // Advanced Settings
  enablePartialFills: z.boolean().default(true),
  autoAdjustPosition: z.boolean().default(false),
  enableLiquidationProtection: z.boolean().default(true),
  
  // Notifications
  enableTradeNotifications: z.boolean().default(true),
  enableErrorNotifications: z.boolean().default(true),
  enableDailyReports: z.boolean().default(false),
  
  // OKX Credentials (conditional validation)
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  passphrase: z.string().optional(),
})
.refine((data) => {
  // Conditional validation: If exchange is OKX, credentials are required
  if (data.exchange === 'OKX') {
    return !!(data.apiKey && data.apiSecret && data.passphrase);
  }
  return true;
}, {
  message: 'API key, secret and passphrase are required for OKX exchange',
  path: ['apiKey']
})
.refine((data) => {
  // Conditional validation: If sizing method requires specific fields
  if (data.sizingMethod === 'Fixed Amount') {
    return data.amountPerTrade !== undefined && data.amountPerTrade > 0;
  }
  if (data.sizingMethod === 'Percentage of Wallet\'s Trade') {
    return data.percentageToCopy !== undefined && data.percentageToCopy > 0;
  }
  return true;
}, {
  message: 'Required fields are missing for the selected position sizing method',
  path: ['sizingMethod']
})
.refine((data) => {
  // Validate trade size ranges
  if (data.minTradeSize && data.maxTradeSize) {
    return data.minTradeSize <= data.maxTradeSize;
  }
  return true;
}, {
  message: 'Minimum trade size must be less than or equal to maximum',
  path: ['minTradeSize']
});

// Export type for TypeScript usage
export type StrategyFormData = z.infer<typeof strategyValidationSchema>;

// Validation utilities
export const validateField = (schema: z.ZodSchema<any>, field: string, value: any) => {
  try {
    const fieldSchema = schema.shape[field];
    if (fieldSchema) {
      fieldSchema.parse(value);
    }
    return { valid: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid value' };
  }
};

// Real-time validation rules
export const validationRules = {
  name: {
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
    message: 'Only letters, numbers, spaces, - and _ characters are allowed'
  },
  walletAddress: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    message: 'Invalid Ethereum address format'
  },
  leverage: {
    min: 1,
    max: 125,
    message: 'Leverage must be between 1-125'
  },
  positionSize: {
    min: 1,
    max: 1000000,
    message: 'Position size must be between 1-1,000,000'
  },
  stopLoss: {
    min: 0,
    max: 100,
    message: 'Stop loss must be between 0-100'
  },
  executionDelay: {
    min: 0,
    max: 300,
    message: 'Delay must be between 0-300 seconds'
  },
  maxSlippage: {
    min: 0,
    max: 10,
    message: 'Slippage must be between 0-10'
  },
  retryAttempts: {
    min: 0,
    max: 5,
    message: 'Retry attempts must be between 0-5'
  }
};