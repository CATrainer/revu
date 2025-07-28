'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function AuthDebugPage() {
  const { user, isLoading, isAuthenticated, checkAuth } = useAuth();
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});

  useEffect(() => {
    // Call checkAuth manually to see what happens
    const debugCheckAuth = async () => {
      console.log('=== Starting manual checkAuth debug ===');
      try {
        await checkAuth();
        console.log('=== checkAuth completed ===');
      } catch (error) {
        console.error('=== checkAuth failed ===', error);
      }
    };

    debugCheckAuth();
  }, [checkAuth]);

  useEffect(() => {
    setDebugInfo({
      user: user,
      isLoading: isLoading,
      isAuthenticated: isAuthenticated,
      timestamp: new Date().toISOString(),
      localStorage_token: typeof window !== 'undefined' ? localStorage.getItem('access_token') : 'N/A (SSR)',
    });
  }, [user, isLoading, isAuthenticated]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Current Auth State:</h2>
          <pre className="text-sm">{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>

        <div className="p-4 bg-blue-100 rounded">
          <h2 className="font-semibold mb-2">Loading Status:</h2>
          <p>Is Loading: <span className="font-mono">{isLoading ? 'TRUE' : 'FALSE'}</span></p>
          <p>Is Authenticated: <span className="font-mono">{isAuthenticated ? 'TRUE' : 'FALSE'}</span></p>
        </div>

        <div className="p-4 bg-green-100 rounded">
          <h2 className="font-semibold mb-2">User Info:</h2>
          {user ? (
            <div>
              <p>Email: {user.email}</p>
              <p>Is Admin: <span className="font-mono">{user.is_admin ? 'TRUE' : 'FALSE'}</span></p>
              <p>Access Status: {user.access_status}</p>
            </div>
          ) : (
            <p>No user data</p>
          )}
        </div>

        <div className="p-4 bg-yellow-100 rounded">
          <h2 className="font-semibold mb-2">Actions:</h2>
          <button 
            onClick={() => checkAuth()} 
            className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
          >
            Manual checkAuth()
          </button>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Reload Page
          </button>
        </div>
      </div>

      <div className="mt-8 p-4 bg-red-100 rounded">
        <h2 className="font-semibold mb-2">Console Logs:</h2>
        <p className="text-sm">Check the browser console (F12) for detailed debugging information.</p>
      </div>
    </div>
  );
}
