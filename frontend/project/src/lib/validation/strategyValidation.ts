import { z } from 'zod';

// Strategy validation schemas
export const StrategySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Strategy name is required').max(100, 'Strategy name must be less than 100 characters'),
  walletAddress: z.string().min(1, 'Wallet address is required').regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'),
  exchange: z.enum(['OKX', 'Binance', 'Bybit']).default('OKX'),
  copyMode: z.enum(['Perpetual', 'Spot']).default('Perpetual'),
  
  // OKX API credentials (nullable for other exchanges)
  okxApiKey: z.string().optional(),
  okxApiSecret: z.string().optional(),
  okxPassphrase: z.string().optional(),
  
  // Strategy settings
  positionSize: z.number().min(1, 'Position size must be at least 1').max(10000, 'Position size must be less than 10000'),
  leverage: z.number().min(1, 'Leverage must be at least 1').max(125, 'Leverage must be less than 125'),
  allowedTokens: z.array(z.string()).default([]),
  
  // Performance tracking
  currentPnL: z.number().default(0),
  totalPnL: z.number().default(0),
  tradesCount: z.number().int().min(0).default(0),
  
  // Strategy configuration
  sizingMethod: z.enum(['Fixed Amount', 'Percentage of Wallet\'s Trade']).default('Fixed Amount'),
  amountPerTrade: z.number().min(0, 'Amount per trade must be non-negative').optional(),
  percentageToCopy: z.number().min(0, 'Percentage must be non-negative').max(1, 'Percentage must be less than or equal to 1').optional(),
  stopLoss: z.number().min(0, 'Stop loss must be non-negative').max(1, 'Stop loss must be less than or equal to 1').optional(),
  dailyLimit: z.number().int().min(0, 'Daily limit must be non-negative').optional(),
  
  isActive: z.boolean().default(true),
  userId: z.number().positive('User ID must be positive'),
});

export const CreateStrategySchema = StrategySchema.omit({ id: true });
export const UpdateStrategySchema = StrategySchema.partial().omit({ id: true, userId: true });

// Strategy Execution validation schemas
export const StrategyExecutionSchema = z.object({
  id: z.string().optional(),
  strategyId: z.number().positive('Strategy ID must be positive'),
  executionType: z.enum(['SIGNAL_RECEIVED', 'TRADE_EXECUTED', 'ERROR_OCCURRED', 'POSITION_CLOSED']),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED']),
  
  // Signal information
  signalType: z.enum(['BUY', 'SELL']).optional(),
  token: z.string().min(1, 'Token is required').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  price: z.number().positive('Price must be positive').optional(),
  
  // Execution details
  exchangeOrderId: z.string().optional(),
  executedPrice: z.number().positive('Executed price must be positive').optional(),
  executedAmount: z.number().positive('Executed amount must be positive').optional(),
  fee: z.number().min(0, 'Fee must be non-negative').optional(),
  
  // Error handling
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  
  // Performance metrics
  pnl: z.number().optional(),
  executionTime: z.number().int().min(0, 'Execution time must be non-negative').optional(),
  
  timestamp: z.date().default(new Date()),
});

export const CreateStrategyExecutionSchema = StrategyExecutionSchema.omit({ id: true });
export const UpdateStrategyExecutionSchema = StrategyExecutionSchema.partial().omit({ id: true, strategyId: true });

// Audit Log validation schemas
export const AuditLogSchema = z.object({
  id: z.string().optional(),
  entityType: z.enum(['Strategy', 'User', 'Trade', 'Configuration']),
  entityId: z.number().int('Entity ID must be an integer'),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'LOGIN', 'LOGOUT']),
  
  // User context
  userId: z.number().positive('User ID must be positive').optional(),
  userRole: z.enum(['ADMIN', 'USER']).optional(),
  
  // Change details
  oldValues: z.record(z.unknown()).optional(),
  newValues: z.record(z.unknown()).optional(),
  
  // Metadata
  ipAddress: z.string().ip('Invalid IP address format').optional(),
  userAgent: z.string().max(500, 'User agent must be less than 500 characters').optional(),
  sessionId: z.string().max(100, 'Session ID must be less than 100 characters').optional(),
  
  // Status
  status: z.enum(['SUCCESS', 'FAILED', 'WARNING']),
  
  // Additional context
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  metadata: z.record(z.unknown()).optional(),
  
  timestamp: z.date().default(new Date()),
});

export const CreateAuditLogSchema = AuditLogSchema.omit({ id: true });
export const UpdateAuditLogSchema = AuditLogSchema.partial().omit({ id: true, entityType: true, entityId: true, action: true, timestamp: true });

// Type exports
export type Strategy = z.infer<typeof StrategySchema>;
export type CreateStrategy = z.infer<typeof CreateStrategySchema>;
export type UpdateStrategy = z.infer<typeof UpdateStrategySchema>;

export type StrategyExecution = z.infer<typeof StrategyExecutionSchema>;
export type CreateStrategyExecution = z.infer<typeof CreateStrategyExecutionSchema>;
export type UpdateStrategyExecution = z.infer<typeof UpdateStrategyExecutionSchema>;

export type AuditLog = z.infer<typeof AuditLogSchema>;
export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;
export type UpdateAuditLog = z.infer<typeof UpdateAuditLogSchema>;

// Form validation helpers
export const validateStrategyForm = (data: unknown) => {
  return CreateStrategySchema.safeParse(data);
};

export const validateStrategyUpdate = (data: unknown) => {
  return UpdateStrategySchema.safeParse(data);
};

export const validateExecutionForm = (data: unknown) => {
  return CreateStrategyExecutionSchema.safeParse(data);
};

export const validateAuditLog = (data: unknown) => {
  return CreateAuditLogSchema.safeParse(data);
};

// Error messages
export const StrategyErrorMessages = {
  name: {
    required: 'Strategy name is required',
    tooShort: 'Strategy name must be at least 1 character',
    tooLong: 'Strategy name must be less than 100 characters'
  },
  walletAddress: {
    required: 'Wallet address is required',
    invalid: 'Invalid wallet address format'
  },
  positionSize: {
    required: 'Position size is required',
    tooSmall: 'Position size must be at least 1',
    tooLarge: 'Position size must be less than 10000'
  },
  leverage: {
    required: 'Leverage is required',
    tooSmall: 'Leverage must be at least 1',
    tooLarge: 'Leverage must be less than 125'
  },
  percentageToCopy: {
    invalid: 'Percentage must be between 0 and 1'
  },
  stopLoss: {
    invalid: 'Stop loss must be between 0 and 1'
  }
};

export const ExecutionErrorMessages = {
  strategyId: {
    required: 'Strategy ID is required',
    invalid: 'Strategy ID must be positive'
  },
  executionType: {
    required: 'Execution type is required',
    invalid: 'Invalid execution type'
  },
  status: {
    required: 'Status is required',
    invalid: 'Invalid status'
  },
  amount: {
    invalid: 'Amount must be positive'
  },
  price: {
    invalid: 'Price must be positive'
  }
};
