/**
 * Polling utilities for checking job status and other async operations.
 */

interface PollOptions {
  interval?: number; // Polling interval in ms (default: 2000)
  maxAttempts?: number; // Maximum polling attempts (default: 60)
  onUpdate?: (data: any) => void; // Callback on each poll
  onComplete?: (data: any) => void; // Callback when complete
  onError?: (error: any) => void; // Callback on error
}

/**
 * Poll a URL until a condition is met or max attempts reached.
 * 
 * @param url URL to poll
 * @param isComplete Function to check if polling should stop
 * @param options Polling options
 * @returns Promise that resolves when complete or rejects on error/timeout
 */
export async function pollUntil(
  url: string,
  isComplete: (data: any) => boolean,
  options: PollOptions = {}
): Promise<any> {
  const {
    interval = 2000,
    maxAttempts = 60,
    onUpdate,
    onComplete,
    onError,
  } = options;
  
  let attempts = 0;
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;
        
        // Get auth token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        
        const response = await fetch(url, {
          cache: 'no-store', // Don't cache poll requests
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        
        if (!response.ok) {
          const error = await response.json();
          onError?.(error);
          reject(error);
          return;
        }
        
        const data = await response.json();
        
        // Call update callback
        onUpdate?.(data);
        
        // Check if complete
        if (isComplete(data)) {
          onComplete?.(data);
          resolve(data);
          return;
        }
        
        // Check max attempts
        if (attempts >= maxAttempts) {
          const error = new Error(`Polling timed out after ${maxAttempts} attempts`);
          onError?.(error);
          reject(error);
          return;
        }
        
        // Schedule next poll
        setTimeout(poll, interval);
        
      } catch (error) {
        onError?.(error);
        reject(error);
      }
    };
    
    // Start polling
    poll();
  });
}

/**
 * Poll job status until it reaches a terminal state (completed/failed/cancelled).
 * 
 * @param jobId Job ID to poll
 * @param options Polling options
 * @returns Promise that resolves with final job status
 */
export async function pollJobStatus(
  jobId: string,
  options: PollOptions = {}
): Promise<any> {
  return pollUntil(
    `/api/jobs/${jobId}/status`,
    (data) => {
      // Job is complete when it reaches a terminal state
      return data.is_terminal === true || data.status in ['completed', 'failed', 'cancelled'];
    },
    {
      interval: 2000, // Poll every 2 seconds
      maxAttempts: 60, // Max 2 minutes
      ...options,
    }
  );
}

/**
 * Poll demo status until it reaches a stable state (enabled/disabled/failed).
 * 
 * @param options Polling options
 * @returns Promise that resolves with final demo status
 */
export async function pollDemoStatus(options: PollOptions = {}): Promise<any> {
  return pollUntil(
    '/api/demo/status',
    (data) => {
      // Demo is stable when not in transitional state
      return !['enabling', 'disabling'].includes(data.status);
    },
    {
      interval: 2000,
      maxAttempts: 60,
      ...options,
    }
  );
}

/**
 * Create a React hook for polling (use in Client Components).
 * 
 * Example usage:
 * ```tsx
 * const { data, isPolling, error } = usePoll('/api/demo/status', 
 *   (data) => data.status !== 'enabling'
 * );
 * ```
 */
export function createPollHook() {
  // This will be implemented when we refactor client components
  // For now, components can use pollUntil directly
}
