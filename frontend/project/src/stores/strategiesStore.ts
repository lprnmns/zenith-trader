import { create } from 'zustand';
import { getStrategies as apiGetStrategies, createStrategy as apiCreateStrategy, deleteStrategy as apiDeleteStrategy, updateStrategy as apiUpdateStrategy } from '@/lib/api';

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
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
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
  isLoading: boolean;
  error: string | null;
  addStrategy: (strategy: Omit<Strategy, 'id' | 'createdAt'>) => void;
  updateStrategy: (id: string, updates: Partial<Strategy>) => void;
  deleteStrategy: (id: string) => void;
  addTrade: (trade: Omit<Trade, 'id'>) => void;
  fetchStrategies: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStrategiesStore = create<StrategiesState>(
  (set, get) => ({
  strategies: [],
  recentTrades: [],
  isLoading: false,
  error: null,
  
  fetchStrategies: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log('[StrategiesStore] Fetching strategies...');
      const response = await apiGetStrategies();
      console.log('[StrategiesStore] Strategies response:', response);
      set({ strategies: response.data, isLoading: false });
    } catch (error) {
      console.error('[StrategiesStore] Fetch error:', error);
      set({ error: 'Failed to fetch strategies', isLoading: false });
    }
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  addStrategy: async (strategy) => {
    await apiCreateStrategy({
      name: strategy.name,
      walletAddress: strategy.walletAddress,
      okxApiKey: strategy.apiKey,
      okxApiSecret: strategy.apiSecret,
      okxPassphrase: (strategy.passphrase && strategy.passphrase.length > 0) ? strategy.passphrase : 'UI_AUTOGEN',
      positionSize: Number(strategy.amountPerTrade ?? 1),
      leverage: Number(strategy.leverage ?? 1),
      allowedTokens: Array.isArray(strategy.allowedTokens) ? strategy.allowedTokens : [],
    });
    await get().fetchStrategies();
  },
  updateStrategy: async (id, updates) => {
    await apiUpdateStrategy(Number(id), updates);
    await get().fetchStrategies();
  },
  deleteStrategy: async (id) => {
    await apiDeleteStrategy(Number(id));
    set((state) => ({ strategies: state.strategies.filter((s) => s.id !== id) }));
  },
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
    })
  );
