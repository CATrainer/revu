/**
 * Server-side utilities for fetching dashboard metrics.
 * Use these in Server Components to fetch data during SSR.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://revu-backend-production.up.railway.app/api/v1';

interface DashboardMetrics {
  total_followers: number;
  total_subscribers: number;
  engagement_rate: number;
  interactions_today: number;
  active_workflows: number;
  follower_change: number;
  engagement_change: number;
  interactions_change: number;
}

/**
 * Get dashboard metrics for a user (server-side).
 * 
 * @param accessToken User's access token
 * @returns Dashboard metrics object
 */
export async function getMetrics(accessToken: string): Promise<DashboardMetrics | null> {
  try {
    const response = await fetch(`${API_URL}/analytics/dashboard-metrics`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      // Cache for 60 seconds - metrics don't need to be real-time
      next: { revalidate: 60 },
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return null;
  }
}

/**
 * Format large numbers for display (e.g., 1000 -> 1K, 1000000 -> 1M).
 * 
 * @param num Number to format
 * @returns Formatted string
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
