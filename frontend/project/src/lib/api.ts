// src/lib/api.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      const token = parsed.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to parse auth storage:', error);
    }
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear auth storage
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getStrategies = () => apiClient.get('/strategies');
export const createStrategy = (data: any) => apiClient.post('/strategies', data);
export const updateStrategy = (id: number, data: any) => apiClient.put(`/strategies/${id}`, data);
export const deleteStrategy = (id: number) => apiClient.delete(`/strategies/${id}`);
export const getWalletPerformance = (address: string) => apiClient.get(`/wallets/${address}/performance`);

export const getDashboardSummary = () => apiClient.get('/dashboard/summary');
export const getSuggestedWallets = () => apiClient.get('/explorer/suggested-wallets');
export const getWalletTradeHistory = (address: string) => apiClient.get(`/wallets/${address}/trade-history`);
export const getWalletAnalysis = (address: string) => apiClient.get(`/explorer/${address}/analysis`);
export const getStrategyTrades = (id: string | number) => apiClient.get(`/strategies/${id}/trades`);
