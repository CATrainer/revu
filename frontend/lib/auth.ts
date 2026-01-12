import { create } from 'zustand';
import { api } from './api';
import type { AccessStatus, UserKind } from './types';

export type SubscriptionTier = 'free' | 'pro';

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
  account_type?: 'creator' | 'agency' | 'legacy' | null;
  approval_status?: 'pending' | 'approved' | 'rejected';
  application_submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
  // Subscription tier fields (for creators)
  subscription_tier?: SubscriptionTier;
  has_payment_method?: boolean;
  trial_start_date?: string | null;
  trial_end_date?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  instagramLogin: () => Promise<void>;
  handleOAuthCallback: (accessToken: string, refreshToken?: string) => Promise<void>;
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
    subscription_tier?: SubscriptionTier;
    has_payment_method?: boolean;
    has_full_platform_access?: boolean;
    allowed_pages?: string[];
    trial_start_date?: string | null;
    trial_end_date?: string | null;
  }>;
  canAccessDashboard: () => boolean;
  getRedirectPath: () => string;
  // Creator tier helpers
  isCreator: () => boolean;
  isAgency: () => boolean;
  isFreeTier: () => boolean;
  isProTier: () => boolean;
  hasFullPlatformAccess: () => boolean;
  canAccessPage: (page: string) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  googleLogin: async () => {
    try {
      // Redirect to backend OAuth endpoint which will redirect to Supabase
      // NEXT_PUBLIC_API_URL already includes /api/v1, so we just append the path
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      window.location.href = `${backendUrl}/auth/oauth/google`;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  },

  instagramLogin: async () => {
    try {
      // Redirect to backend OAuth endpoint which will redirect to Supabase
      // NEXT_PUBLIC_API_URL already includes /api/v1, so we just append the path
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      window.location.href = `${backendUrl}/auth/oauth/instagram`;
    } catch (error) {
      console.error('Instagram login error:', error);
      throw error;
    }
  },

  handleOAuthCallback: async (accessToken: string, refreshToken?: string) => {
    try {
      // Exchange Supabase tokens for our app tokens
      const response = await api.post('/auth/oauth/callback', {
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Store our app's tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }

      // Get full user data
      const userResponse = await api.get('/auth/me');
      set({ user: userResponse.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('OAuth callback error:', error);
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
      set({ user: userResponse.data, isAuthenticated: true, isLoading: false });
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
      set({ user: response.data, isAuthenticated: true, isLoading: false });
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
    set({ user: null, isAuthenticated: false, isLoading: false });
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
    if (!user) return false;
    
    // Admin always has access
    if (user.is_admin) return true;
    
    // New approval workflow (users with approval_status field)
    if (user.approval_status) {
      // Must be approved to access dashboard
      if (user.approval_status === 'approved') return true;
      // Pending or rejected users cannot access
      return false;
    }
    
    // Legacy users (pre-approval workflow) - check old fields
    if (user.account_type === 'legacy' && user.access_status === 'full') return true;
    
    // Old waiting list users who got full access before approval workflow
    if (!user.approval_status && user.access_status === 'full') return true;
    
    return false;
  },

  getRedirectPath: (): string => {
    const { user } = get();
    if (!user) return '/login';
    
    // Admin users go to admin dashboard
    if (user.is_admin) return '/admin';
    
    // Agency users always go to agency dashboard (they're auto-approved via /signup/agency)
    if (user.account_type === 'agency') {
      return '/agency';
    }
    
    // New approval workflow routing (users with approval_status field)
    if (user.approval_status) {
      // Step 1: Select account type (creator only - agencies use separate signup)
      if (!user.account_type || user.account_type === null) {
        return '/onboarding/account-type';
      }
      
      // Step 2: Submit application (creator only)
      if (!user.application_submitted_at && user.account_type === 'creator') {
        return '/onboarding/creator-application';
      }
      
      // Step 3: Check approval status
      if (user.approval_status === 'pending') {
        return '/onboarding/pending';
      }
      
      if (user.approval_status === 'rejected') {
        return '/onboarding/rejected';
      }
      
      if (user.approval_status === 'approved') {
        return '/dashboard';
      }
    }
    
    // Legacy workflow (users without approval_status)
    // These are old users who signed up before the approval workflow
    if (!user.approval_status) {
      // Legacy users with full access
      if (user.account_type === 'legacy' && user.access_status === 'full') {
        return '/dashboard';
      }
      
      // Old users who had full access before approval workflow
      if (user.access_status === 'full') {
        return '/dashboard';
      }
    }
    
    // Fallback - send to account type selection (for creators)
    return '/onboarding/account-type';
  },

  // Creator tier helper methods
  isCreator: (): boolean => {
    const { user } = get();
    return user?.account_type === 'creator';
  },

  isAgency: (): boolean => {
    const { user } = get();
    return user?.account_type === 'agency';
  },

  isFreeTier: (): boolean => {
    const { user } = get();
    if (!user) return true;
    // Only creators have tiers - agencies always have full access
    if (user.account_type !== 'creator') return false;
    return user.subscription_tier === 'free' || !user.subscription_tier;
  },

  isProTier: (): boolean => {
    const { user } = get();
    if (!user) return false;
    // Only creators have tiers
    if (user.account_type !== 'creator') return false;
    return user.subscription_tier === 'pro';
  },

  hasFullPlatformAccess: (): boolean => {
    const { user } = get();
    if (!user) return false;
    
    // Admin always has full access
    if (user.is_admin) return true;
    
    // Agency accounts always have full access (free)
    if (user.account_type === 'agency') return true;
    
    // Creator accounts: only if Pro tier (trial or paid)
    if (user.account_type === 'creator') {
      return user.subscription_tier === 'pro';
    }
    
    // Legacy accounts default to full access
    return true;
  },

  canAccessPage: (page: string): boolean => {
    const { user, hasFullPlatformAccess } = get();
    if (!user) return false;
    
    // If user has full platform access, they can access any page
    if (hasFullPlatformAccess()) return true;
    
    // Free tier creators can only access opportunities and settings
    const allowedPagesForFreeTier = ['opportunities', 'settings'];
    return allowedPagesForFreeTier.includes(page.toLowerCase());
  },
}));