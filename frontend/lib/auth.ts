import { create } from 'zustand';
import { api } from './api';
import type { AccessStatus, UserKind } from './types';

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
  is_admin: boolean;
  has_account?: boolean;
  access_status: AccessStatus;
  user_kind?: UserKind;
  joined_waiting_list_at: string | null;
  early_access_granted_at: string | null;
  demo_requested: boolean;
  demo_requested_at: string | null;
  demo_access_type?: 'creator' | 'business' | 'agency_creators' | 'agency_businesses' | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  instagramLogin: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  requestDemo: () => Promise<void>;
  getAccessStatus: () => Promise<{
    access_status: AccessStatus;
    user_kind?: UserKind;
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

  googleLogin: async () => {
    try {
      // This would typically redirect to Google OAuth flow
      // For now, we'll just simulate this with a console message
      console.log('Google OAuth login initiated');
      
      // In a real implementation, we would redirect to something like:
      // window.location.href = '/api/auth/google';
      
      // For demonstration purposes only - this would be handled by the OAuth callback
      alert('Google login feature is coming soon!');
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  },

  instagramLogin: async () => {
    try {
      // This would typically redirect to Instagram OAuth flow
      // For now, we'll just simulate this with a console message
      console.log('Instagram OAuth login initiated');
      
      // In a real implementation, we would redirect to something like:
      // window.location.href = '/api/auth/instagram';
      
      // For demonstration purposes only - this would be handled by the OAuth callback
      alert('Instagram login feature is coming soon!');
    } catch (error) {
      console.error('Instagram login error:', error);
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    try {
      // Use URLSearchParams for x-www-form-urlencoded payloads
      const params = new URLSearchParams();
      params.set('username', email); // OAuth2 spec uses username
      params.set('password', password);

      const doLogin = async () =>
        api.post('/auth/login', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

      let response;
      try {
        response = await doLogin();
      } catch (err: unknown) {
        const e = err as { response?: { status?: number }, code?: string };
        const status = e?.response?.status;
        const retriable = e?.code === 'ERR_NETWORK' || (typeof status === 'number' && status >= 500);
        if (retriable) {
          await new Promise((r) => setTimeout(r, 600));
          response = await doLogin();
        } else {
          throw err;
        }
      }

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
  const params = new URLSearchParams();
  params.set('username', email);
  params.set('password', password);

  const loginResponse = await api.post('/auth/login', params, {
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
    // Demo removed; keep endpoint no-op client-side
    return;
  },

  getAccessStatus: async () => {
    const response = await api.get('/auth/me/access-status');
    return response.data;
  },

  canAccessDashboard: (): boolean => {
    const { user } = get();
    return user?.access_status === 'full';
  },

  getRedirectPath: (): string => {
    const { user } = get();
  if (!user) return '/login';
  // Admin users go to admin dashboard
  if (user.is_admin) return '/admin';
  // Regular users
  if (user.access_status === 'waiting') return '/waiting-area';
  if (user.access_status === 'full') return '/dashboard';
  return '/waiting-area';
  },
}));