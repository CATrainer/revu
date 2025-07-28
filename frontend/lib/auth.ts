import { create } from 'zustand';
import { api } from './api';

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
  is_admin: boolean;
  access_status: 'waiting_list' | 'early_access' | 'full_access';
  joined_waiting_list_at: string | null;
  early_access_granted_at: string | null;
  demo_requested: boolean;
  demo_requested_at: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  requestDemo: () => Promise<void>;
  getAccessStatus: () => Promise<{
    access_status: string;
    can_access_dashboard: boolean;
    joined_waiting_list_at: string | null;
    early_access_granted_at: string | null;
    demo_requested: boolean;
    demo_requested_at: string | null;
  }>;
  canAccessDashboard: () => boolean;
  getRedirectPath: () => string;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('username', email); // OAuth2 spec uses username
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Only store in localStorage in browser environment
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      
      // Get user data
      const userResponse = await api.get('/auth/me');
      set({ user: userResponse.data, isAuthenticated: true });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  signup: async (email: string, password: string, fullName: string) => {
    try {
      const response = await api.post('/auth/signup', {
        email,
        password,
        full_name: fullName,
      });

      // Auto-login after signup
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const loginResponse = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Only store in localStorage in browser environment
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', loginResponse.data.access_token);
        localStorage.setItem('refresh_token', loginResponse.data.refresh_token);
      }

      // Use the signup response data which should have the updated user info
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }

    // Only clear localStorage in browser environment
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    
    // Only access localStorage in the browser environment
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }
    
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Auth check failed:', error);
      // Only clear localStorage in browser environment
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  requestDemo: async () => {
    await api.post('/auth/request-demo', {});
    // Refresh user data to update demo_requested status
    const response = await api.get('/auth/me');
    set(state => ({ ...state, user: response.data }));
  },

  getAccessStatus: async () => {
    const response = await api.get('/auth/me/access-status');
    return response.data;
  },

  canAccessDashboard: (): boolean => {
    const { user } = get();
    return user?.access_status === 'early_access' || user?.access_status === 'full_access';
  },

  getRedirectPath: (): string => {
    const { user } = get();
    if (!user) return '/auth/login';
    
    // Admin users go to admin dashboard
    if (user.is_admin) return '/admin';
    
    // Regular users based on access status
    if (user.access_status === 'waiting_list') return '/waiting-area';
    if (user.access_status === 'early_access' || user.access_status === 'full_access') return '/dashboard';
    
    // Fallback
    return '/waiting-area';
  },
}));