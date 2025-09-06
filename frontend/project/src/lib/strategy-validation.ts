import { z } from 'zod';

// Strategy validation schema with enhanced rules
export const strategyValidationSchema = z.object({
  // Basic Information
  name: z.string()
    .min(1, 'Strateji adı gereklidir')
    .max(50, 'Strateji adı çok uzun')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Sadece harf, rakam, boşluk, - ve _ karakterleri kullanılabilir'),
    
  walletAddress: z.string()
    .min(42, 'Geçersiz cüzdan adresi')
    .max(42, 'Geçersiz cüzdan adresi')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Geçersiz Ethereum adres formatı'),
    
  // Exchange Configuration
  exchange: z.enum(['OKX', 'Binance', 'Bybit'], {
    errorMap: () => ({ message: 'Geçerli bir borsa seçin' })
  }),
  
  copyMode: z.enum(['Perpetual', 'Spot'], {
    errorMap: () => ({ message: 'Geçerli bir kopyalama modu seçin' })
  }),
  
  // Futures Configuration
  leverage: z.number()
    .min(1, 'Kaldıraç 1 veya daha büyük olmalıdır')
    .max(125, 'Kaldıraç 125\'ten küçük olmalıdır'),
    
  marginMode: z.enum(['cross', 'isolated'], {
    errorMap: () => ({ message: 'Geçerli bir marj modu seçin' })
  }),
  
  // Position Sizing
  sizingMethod: z.enum(['Fixed Amount', 'Percentage of Wallet\'s Trade'], {
    errorMap: () => ({ message: 'Geçerli bir pozisyon boyutlandırma yöntemi seçin' })
  }),
  
  positionSize: z.number()
    .min(1, 'Pozisyon boyutu 1 veya daha büyük olmalıdır')
    .max(1000000, 'Pozisyon boyutu çok büyük'),
    
  amountPerTrade: z.number()
    .optional()
    .refine((val) => !val || val >= 1, {
      message: 'İşlem başına tutar 1 veya daha büyük olmalıdır'
    })
    .refine((val) => !val || val <= 1000000, {
      message: 'İşlem başına tutar çok büyük'
    }),
    
  percentageToCopy: z.number()
    .optional()
    .refine((val) => !val || (val >= 0 && val <= 100), {
      message: 'Kopyalama yüzdesi 0-100 arasında olmalıdır'
    }),
  
  // Risk Management
  stopLoss: z.number()
    .optional()
    .refine((val) => !val || (val >= 0 && val <= 100), {
      message: 'Stop loss 0-100 arasında olmalıdır'
    }),
    
  dailyLimit: z.number()
    .optional()
    .refine((val) => !val || val >= 1, {
      message: 'Günlük limit 1 veya daha büyük olmalıdır'
    }),
  
  // Symbol Filters
  allowedTokens: z.array(z.string())
    .default([])
    .refine((tokens) => tokens.length <= 50, {
      message: 'En fazla 50 token ekleyebilirsiniz'
    }),
    
  minTradeSize: z.number()
    .optional()
    .refine((val) => !val || val >= 0, {
      message: 'Minimum işlem boyutu negatif olamaz'
    }),
    
  maxTradeSize: z.number()
    .optional()
    .refine((val) => !val || val >= 0, {
      message: 'Maksimum işlem boyutu negatif olamaz'
    }),
  
  // Execution Settings
  executionDelay: z.number()
    .min(0, 'Gecikme 0 veya daha büyük olmalıdır')
    .max(300, 'Gecikme 300 saniyeden küçük olmalıdır')
    .default(0),
    
  maxSlippage: z.number()
    .min(0, 'Slippage 0 veya daha büyük olmalıdır')
    .max(10, 'Slippage 10\'dan küçük olmalıdır')
    .default(1),
    
  retryAttempts: z.number()
    .min(0, 'Yeniden deneme sayısı 0 veya daha büyük olmalıdır')
    .max(5, 'Yeniden deneme sayısı 5\'ten küçük olmalıdır')
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
  message: 'OKX borsası için API key, secret ve passphrase gereklidir',
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
  message: 'Seçilen pozisyon boyutlandırma yöntemi için ilgili alanlar gereklidir',
  path: ['sizingMethod']
})
.refine((data) => {
  // Validate trade size ranges
  if (data.minTradeSize && data.maxTradeSize) {
    return data.minTradeSize <= data.maxTradeSize;
  }
  return true;
}, {
  message: 'Minimum işlem boyutu maksimumdan küçük veya eşit olmalıdır',
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
    return { valid: false, error: 'Geçersiz değer' };
  }
};

// Real-time validation rules
export const validationRules = {
  name: {
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
    message: 'Sadece harf, rakam, boşluk, - ve _ karakterleri kullanılabilir'
  },
  walletAddress: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    message: 'Geçersiz Ethereum adres formatı'
  },
  leverage: {
    min: 1,
    max: 125,
    message: 'Kaldıraç 1-125 arasında olmalıdır'
  },
  positionSize: {
    min: 1,
    max: 1000000,
    message: 'Pozisyon boyutu 1-1,000,000 arasında olmalıdır'
  },
  stopLoss: {
    min: 0,
    max: 100,
    message: 'Stop loss 0-100 arasında olmalıdır'
  },
  executionDelay: {
    min: 0,
    max: 300,
    message: 'Gecikme 0-300 saniye arasında olmalıdır'
  },
  maxSlippage: {
    min: 0,
    max: 10,
    message: 'Slippage 0-10 arasında olmalıdır'
  },
  retryAttempts: {
    min: 0,
    max: 5,
    message: 'Yeniden deneme sayısı 0-5 arasında olmalıdır'
  }
};