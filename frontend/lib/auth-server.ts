/**
 * Server-side authentication utilities for Next.js Server Components and API routes.
 * 
 * This module provides functions to validate sessions and get user data on the server.
 * It reads from httpOnly cookies (future) or falls back to headers (current).
 */

import { cookies, headers } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://revu-backend-production.up.railway.app/api/v1';

interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  demo_mode_status?: string;
  approval_status?: string;
  account_type?: string;
}

interface Session {
  user: User;
  accessToken: string;
}

/**
 * Get the current session from server context (Server Components, API Routes).
 * 
 * This function:
 * 1. Reads access token from cookies (future) or Authorization header (current)
 * 2. Validates token with FastAPI
 * 3. Returns user data if valid
 * 
 * @returns Session object with user and token, or null if not authenticated
 */
export async function getServerSession(): Promise<Session | null> {
  try {
    // Try to get token from cookie first (for future cookie-based auth)
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('access_token')?.value;
    
    // Fallback: Get from Authorization header (current localStorage-based auth)
    if (!accessToken) {
      const headersList = await headers();
      const authHeader = headersList.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    if (!accessToken) {
      return null;
    }
    
    // Validate token and get user from FastAPI
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store', // Always fetch fresh user data
    });
    
    if (!response.ok) {
      return null;
    }
    
    const user = await response.json();
    
    return {
      user,
      accessToken,
    };
  } catch (error) {
    console.error('Failed to get server session:', error);
    return null;
  }
}

/**
 * Require authentication for a Server Component or API route.
 * Throws an error if user is not authenticated.
 * 
 * @returns Session object
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getServerSession();
  
  if (!session) {
    throw new Error('Unauthorized - Authentication required');
  }
  
  return session;
}

/**
 * Require admin access for a Server Component or API route.
 * Throws an error if user is not an admin.
 * 
 * @returns Session object with admin user
 * @throws Error if not authenticated or not admin
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  
  if (!session.user.is_admin) {
    throw new Error('Forbidden - Admin access required');
  }
  
  return session;
}

/**
 * Check if user can access dashboard.
 * 
 * @param user User object
 * @returns true if user can access dashboard
 */
export function canAccessDashboard(user: User): boolean {
  // Admin always has access
  if (user.is_admin) return true;
  
  // New approval workflow
  if (user.approval_status) {
    return user.approval_status === 'approved';
  }
  
  // Legacy users with full access
  return false;
}

/**
 * Get redirect path for user based on their account status.
 * 
 * @param user User object
 * @returns Path to redirect to
 */
export function getRedirectPath(user: User): string {
  if (!user) return '/login';
  
  // Admin users
  if (user.is_admin) return '/admin';
  
  // New approval workflow
  if (user.approval_status) {
    // Step 1: Select account type
    if (!user.account_type) {
      return '/onboarding/account-type';
    }
    
    // Step 2: Submit application (handled by onboarding flow)
    
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
  
  // Fallback
  return '/onboarding/account-type';
}
