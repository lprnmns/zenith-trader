// src/lib/api.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
});

export const getStrategies = () => apiClient.get('/strategies');
export const createStrategy = (data: any) => apiClient.post('/strategies', data);
export const updateStrategy = (id: number, data: any) => apiClient.put(`/strategies/${id}`, data);
export const deleteStrategy = (id: number) => apiClient.delete(`/strategies/${id}`);
export const getWalletPerformance = (address: string) => apiClient.get(`/wallets/${address}/performance`);

