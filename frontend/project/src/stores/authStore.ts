import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const API_BASE = 'http://localhost:3001/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      
      login: async (email: string, password: string) => {
        try {
          const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (data.success) {
            const isAdmin = data.user.role === 'admin';
            set({ 
              user: data.user, 
              token: data.token,
              isAuthenticated: true,
              isAdmin 
            });
            return { success: true };
          } else {
            return { success: false, error: data.error };
          }
        } catch (error) {
          console.error('Login error:', error);
          return { success: false, error: 'Network error occurred' };
        }
      },

      register: async (email: string, password: string) => {
        try {
          const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (data.success) {
            const isAdmin = data.user.role === 'admin';
            set({ 
              user: data.user, 
              token: data.token,
              isAuthenticated: true,
              isAdmin 
            });
            return { success: true };
          } else {
            return { success: false, error: data.error };
          }
        } catch (error) {
          console.error('Register error:', error);
          return { success: false, error: 'Network error occurred' };
        }
      },

      logout: () => {
        const { token } = get();
        
        // Notify backend (optional)
        if (token) {
          fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }).catch(console.error);
        }

        set({ 
          user: null, 
          token: null,
          isAuthenticated: false,
          isAdmin: false 
        });
      },

      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          return false;
        }

        try {
          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const isAdmin = data.user.role === 'admin';
            set({ 
              user: data.user,
              isAuthenticated: true,
              isAdmin 
            });
            return true;
          } else {
            // Token expired or invalid
            set({ 
              user: null, 
              token: null,
              isAuthenticated: false,
              isAdmin: false 
            });
            return false;
          }
        } catch (error) {
          console.error('Auth check error:', error);
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);