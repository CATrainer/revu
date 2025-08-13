'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function WaitlistSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // const userId = searchParams.get('user_id'); // Not currently used
  const hasAccount = searchParams.get('has_account') === 'true';
  const email = searchParams.get('email') || '';

  useEffect(() => {
    // If user already has account, redirect to login
    if (hasAccount) {
      router.push('/login?message=account_exists');
    }
  }, [hasAccount, router]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/users/waitlist/create-account', {
        email,
        password
      });

      // Log the user in using the proper auth flow
      await login(email, password);
      
      // Redirect to waiting area
      router.push('/waiting-area');
      
    } catch (error: unknown) {
      console.error('Failed to create account:', error);
      let errorMessage = 'Failed to create account. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        errorMessage = axiosError.response?.data?.detail || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (hasAccount) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-md mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">You&apos;re in!</CardTitle>
            <CardDescription>
              Thank you for getting early access. We&apos;ll notify you as soon as Repruv is ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!showAccountForm ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-secondary-dark mb-4">
                    Want to get special offers and potential early access?
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => setShowAccountForm(true)}
                      className="w-full"
                    >
                      Create Account Now
                    </Button>
                    <Button 
                      variant="outline" 
                      asChild
                      className="w-full"
                    >
                      <Link href="/">Return to Home</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    disabled
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                  />
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setShowAccountForm(false)}
                    className="w-full"
                  >
                    Maybe Later
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function WaitlistSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WaitlistSuccessContent />
    </Suspense>
  );
}
