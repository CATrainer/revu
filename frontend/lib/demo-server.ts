/**
 * Server-side utilities for demo mode operations.
 * Use these in Server Components to fetch demo status.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://revu-backend-production.up.railway.app/api/v1';

interface DemoStatus {
  demo_mode: boolean;
  status: string;
  error?: string;
  user_id: string;
  job_id?: string;
  job_status?: string;
  job_error?: string;
  profile?: any;
}

/**
 * Get demo mode status for a user (server-side).
 * 
 * @param accessToken User's access token
 * @returns Demo status object
 */
export async function getDemoStatus(accessToken: string): Promise<DemoStatus | null> {
  try {
    const response = await fetch(`${API_URL}/demo/status`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store', // Always fetch fresh status
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch demo status:', error);
    return null;
  }
}

/**
 * Check if demo mode is in a transitional state (enabling/disabling).
 * 
 * @param status Demo status object
 * @returns true if demo mode is transitioning
 */
export function isDemoTransitioning(status: DemoStatus | null): boolean {
  if (!status) return false;
  return status.status === 'enabling' || status.status === 'disabling';
}

/**
 * Check if demo mode is enabled.
 * 
 * @param status Demo status object
 * @returns true if demo mode is fully enabled
 */
export function isDemoEnabled(status: DemoStatus | null): boolean {
  if (!status) return false;
  return status.status === 'enabled';
}

/**
 * Check if demo mode failed.
 * 
 * @param status Demo status object
 * @returns true if demo mode is in failed state
 */
export function isDemoFailed(status: DemoStatus | null): boolean {
  if (!status) return false;
  return status.status === 'failed';
}
