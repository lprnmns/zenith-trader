import { create } from 'zustand';

export interface Strategy {
  id: string;
  name: string;
  walletAddress: string;
  exchange: 'OKX' | 'Binance' | 'Bybit';
  copyMode: 'Perpetual' | 'Spot';
  isActive: boolean;
  currentPnL: number;
  totalPnL: number;
  tradesCount: number;
  createdAt: string;
  leverage?: number;
  stopLoss?: number;
  dailyLimit?: number;
  sizingMethod: 'Fixed Amount' | 'Percentage of Wallet\'s Trade';
  amountPerTrade?: number;
  percentageToCopy?: number;
  allowedTokens?: string[];
}

export interface Trade {
  id: string;
  strategyId: string;
  strategyName: string;
  action: 'BUY' | 'SELL';
  token: string;
  amount: number;
  status: 'Success' | 'Failed';
  timestamp: string;
  pnl?: number;
}

interface StrategiesState {
  strategies: Strategy[];
  recentTrades: Trade[];
  addStrategy: (strategy: Omit<Strategy, 'id' | 'createdAt'>) => void;
  updateStrategy: (id: string, updates: Partial<Strategy>) => void;
  deleteStrategy: (id: string) => void;
  addTrade: (trade: Omit<Trade, 'id'>) => void;
}

export const useStrategiesStore = create<StrategiesState>((set) => ({
  strategies: [
    {
      id: '1',
      name: 'DeFi Whale Copy',
      walletAddress: '0x742d35cc619c28d6bbdd42688ad1063fef9e5e7a',
      exchange: 'Binance',
      copyMode: 'Perpetual',
      isActive: true,
      currentPnL: 1250.50,
      totalPnL: 3420.75,
      tradesCount: 28,
      createdAt: '2024-01-15',
      leverage: 3,
      stopLoss: 5,
      dailyLimit: 10,
      sizingMethod: 'Fixed Amount',
      amountPerTrade: 500,
    },
    {
      id: '2',
      name: 'ETH Momentum',
      walletAddress: '0x8ba1f109551bd432803012645haca7f67c863bd',
      exchange: 'OKX',
      copyMode: 'Spot',
      isActive: false,
      currentPnL: -125.30,
      totalPnL: 856.20,
      tradesCount: 15,
      createdAt: '2024-01-20',
      sizingMethod: 'Percentage of Wallet\'s Trade',
      percentageToCopy: 10,
      allowedTokens: ['ETH', 'BTC'],
    }
  ],
  recentTrades: [
    {
      id: '1',
      strategyId: '1',
      strategyName: 'DeFi Whale Copy',
      action: 'BUY',
      token: 'ARB',
      amount: 500,
      status: 'Success',
      timestamp: '2024-01-25T10:30:00Z',
      pnl: 45.20,
    },
    {
      id: '2',
      strategyId: '1',
      strategyName: 'DeFi Whale Copy',
      action: 'SELL',
      token: 'MATIC',
      amount: 750,
      status: 'Success',
      timestamp: '2024-01-25T09:15:00Z',
      pnl: -12.80,
    },
    {
      id: '3',
      strategyId: '2',
      strategyName: 'ETH Momentum',
      action: 'BUY',
      token: 'ETH',
      amount: 1200,
      status: 'Failed',
      timestamp: '2024-01-25T08:45:00Z',
    },
  ],
  addStrategy: (strategy) =>
    set((state) => ({
      strategies: [
        ...state.strategies,
        {
          ...strategy,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString().split('T')[0],
        },
      ],
    })),
  updateStrategy: (id, updates) =>
    set((state) => ({
      strategies: state.strategies.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  deleteStrategy: (id) =>
    set((state) => ({
      strategies: state.strategies.filter((s) => s.id !== id),
    })),
  addTrade: (trade) =>
    set((state) => ({
      recentTrades: [
        {
          ...trade,
          id: Math.random().toString(36).substr(2, 9),
        },
        ...state.recentTrades,
      ].slice(0, 10),
    })),
}));