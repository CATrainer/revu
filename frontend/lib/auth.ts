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
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email); // OAuth2 spec uses username
    formData.append('password', password);

    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);

    // Get user data
    const userResponse = await api.get('/auth/me');
    set({ user: userResponse.data, isAuthenticated: true });
  },

  signup: async (email: string, password: string, fullName: string) => {
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

    localStorage.setItem('access_token', loginResponse.data.access_token);
    localStorage.setItem('refresh_token', loginResponse.data.refresh_token);

    set({ user: response.data, isAuthenticated: true });
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
}));