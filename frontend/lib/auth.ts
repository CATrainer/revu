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
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      console.log('Starting login process...');
      
      const formData = new FormData();
      formData.append('username', email); // OAuth2 spec uses username
      formData.append('password', password);

      console.log('Sending login request...');
      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('Login response received:', response.data);

      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);

      console.log('Tokens stored, fetching user data...');
      
      // Get user data
      const userResponse = await api.get('/auth/me');
      console.log('User data received:', userResponse.data);
      
      set({ user: userResponse.data, isAuthenticated: true });
      console.log('Auth state updated successfully');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  signup: async (email: string, password: string, fullName: string) => {
    try {
      console.log('Starting signup process...');
      
      const response = await api.post('/auth/signup', {
        email,
        password,
        full_name: fullName,
      });

      console.log('Signup response received:', response.data);

      // Auto-login after signup
      console.log('Auto-logging in after signup...');
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const loginResponse = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('Auto-login response:', loginResponse.data);

      localStorage.setItem('access_token', loginResponse.data.access_token);
      localStorage.setItem('refresh_token', loginResponse.data.refresh_token);

      // Use the signup response data which should have the updated user info
      console.log('Setting user data from signup response');
      set({ user: response.data, isAuthenticated: true });
      console.log('Signup completed successfully');
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

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
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
}));