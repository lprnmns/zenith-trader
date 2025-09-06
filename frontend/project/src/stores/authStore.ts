import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  role: string;
  createdAt: string;
  googleId?: string;
  googleEmail?: string;
  name?: string;
  picture?: string;
  okxApiKey?: string;
  okxApiSecret?: string;
  okxPassphrase?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (token: string, user: User) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  updateOKXCredentials: (credentials: { okxApiKey: string; okxApiSecret: string; okxPassphrase: string }) => Promise<{ success: boolean; error?: string }>;
  fetchOKXCredentials: () => Promise<{ success: boolean; credentials?: any; error?: string }>;
}

const API_BASE = 'http://localhost:3001/api';

export const useAuthStore = create<AuthState>(
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
            const isAdmin = data.user.role === 'ADMIN';
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
            const isAdmin = data.user.role === 'ADMIN';
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

      googleLogin: async (token: string, user: User) => {
        try {
          const isAdmin = user.role === 'ADMIN';
          set({ 
            user, 
            token,
            isAuthenticated: true,
            isAdmin 
          });
          return { success: true };
        } catch (error) {
          console.error('Google login error:', error);
          return { success: false, error: 'Failed to process Google login' };
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
            const isAdmin = data.user.role === 'ADMIN';
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

      updateOKXCredentials: async (credentials) => {
        const { token } = get();
        
        if (!token) {
          return { success: false, error: 'Not authenticated' };
        }

        try {
          const response = await fetch(`${API_BASE}/auth/okx-credentials`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(credentials),
          });

          const data = await response.json();

          if (data.success) {
            // Update user in store with new credentials
            set({ 
              user: { ...get().user, ...credentials }
            });
            return { success: true };
          } else {
            return { success: false, error: data.error };
          }
        } catch (error) {
          console.error('OKX credentials update error:', error);
          return { success: false, error: 'Network error occurred' };
        }
      },

      fetchOKXCredentials: async () => {
        const { token } = get();
        
        if (!token) {
          return { success: false, error: 'Not authenticated' };
        }

        try {
          const response = await fetch(`${API_BASE}/auth/okx-credentials`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (data.success) {
            return { 
              success: true, 
              credentials: {
                okxApiKey: data.user.okxApiKey,
                okxApiSecret: data.user.okxApiSecret,
                okxPassphrase: data.user.okxPassphrase,
              }
            };
          } else {
            return { success: false, error: data.error };
          }
        } catch (error) {
          console.error('OKX credentials fetch error:', error);
          return { success: false, error: 'Network error occurred' };
        }
      },
    })
  );