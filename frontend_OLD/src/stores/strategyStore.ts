// src/stores/strategyStore.ts
import { create } from 'zustand';
import { getStrategies, createStrategy, deleteStrategy, updateStrategy } from '@/lib/api';

interface Strategy {
  id: number;
  [key: string]: any;
}

interface StrategyState {
  strategies: Strategy[];
  isLoading: boolean;
  error: string | null;
  fetchStrategies: () => Promise<void>;
  addStrategy: (newStrategy: any) => Promise<void>;
  removeStrategy: (id: number) => Promise<void>;
  editStrategy: (id: number, updatedData: any) => Promise<void>;
}

export const useStrategyStore = create<StrategyState>((set) => ({
  strategies: [],
  isLoading: false,
  error: null,
  fetchStrategies: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getStrategies();
      set({ strategies: response.data, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch strategies.', isLoading: false });
    }
  },
  addStrategy: async (newStrategy) => {
    await createStrategy(newStrategy);
    set((state) => ({ ...state }));
  },
  removeStrategy: async (id) => {
    await deleteStrategy(id);
    set((state) => ({ strategies: state.strategies.filter((s) => s.id !== id) }));
  },
  editStrategy: async (id, updatedData) => {
    await updateStrategy(id, updatedData);
    set((state) => ({ ...state }));
  },
}));
