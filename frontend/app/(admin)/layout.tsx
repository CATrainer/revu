'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

// Simple loading spinner component
const LoadingSpinner = ({ className = "" }: { className?: string }) => (
  <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 ${className}`}></div>
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not logged in, redirect to login
        router.push('/auth/login');
        return;
      }

      if (!user.is_admin) {
        // Not an admin, redirect to appropriate page based on their access level
        const { getRedirectPath } = useAuth.getState();
        const redirectPath = getRedirectPath();
        router.push(redirectPath);
        return;
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !user.is_admin) {
    return null; // Will redirect in useEffect
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Welcome, {user.full_name}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Admin
              </span>
            </div>
          </div>
        </div>
      </div>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
