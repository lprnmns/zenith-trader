import { create } from 'zustand';
import { getStrategies as apiGetStrategies, createStrategy as apiCreateStrategy, deleteStrategy as apiDeleteStrategy, updateStrategy as apiUpdateStrategy } from '@/lib/api';

export interface Strategy {
  id: number;
  [key: string]: any;
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
  fetchStrategies: () => Promise<void>;
  addStrategy: (payload: any) => Promise<void>;
  updateStrategy: (id: number, payload: any) => Promise<void>;
  deleteStrategy: (id: number) => Promise<void>;
}

export const useStrategiesStore = create<StrategiesState>((set, get) => ({
  strategies: [],
  recentTrades: [],
  fetchStrategies: async () => {
    const res = await apiGetStrategies();
    set({ strategies: res.data });
  },
  addStrategy: async (payload) => {
    await apiCreateStrategy(payload);
    await get().fetchStrategies();
  },
  updateStrategy: async (id, payload) => {
    await apiUpdateStrategy(id, payload);
    await get().fetchStrategies();
  },
  deleteStrategy: async (id) => {
    await apiDeleteStrategy(id);
    set((state) => ({ strategies: state.strategies.filter((s) => s.id !== id) }));
  },
}));