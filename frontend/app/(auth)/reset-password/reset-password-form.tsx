'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/auth';
import { FormInput } from '@/components/ui/form-input';
import { LoadingButton } from '@/components/ui/loading-button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';

interface ErrorResponse {
  detail?: string;
  message?: string;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password');

  // Handle client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined' || !isClient) return;
    
    // Supabase sends access_token and refresh_token as URL fragments
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    console.log('URL hash:', hash);
    console.log('Extracted access_token:', accessToken ? 'present (length: ' + accessToken.length + ')' : 'missing');

    if (error) {
      console.error('Supabase error in URL:', error, errorDescription);
      setServerError(errorDescription || 'Invalid or expired reset link');
      return;
    }

    if (accessToken) {
      console.log('Setting token from URL hash');
      setToken(accessToken);
      setValue('token', accessToken);
    } else {
      // Also check query params as fallback
      const tokenParam = searchParams.get('token');
      console.log('Checking query params for token:', tokenParam ? 'present' : 'missing');
      if (tokenParam) {
        setToken(tokenParam);
        setValue('token', tokenParam);
      } else {
        console.log('No token found, redirecting to forgot-password');
        // Redirect to forgot password if no token
        router.push('/forgot-password');
      }
    }
  }, [searchParams, setValue, router, isClient]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError('');

    try {
      console.log('Submitting password reset with token:', data.token ? 'present' : 'missing');
      console.log('Token length:', data.token?.length || 0);
      console.log('Password length:', data.password?.length || 0);
      
      const requestData = {
        token: data.token,
        new_password: data.password,
      };
      
      console.log('Request payload:', requestData);
      
      const response = await api.post('/auth/reset-password', requestData);
      
      console.log('Password reset successful:', response.data);
      setSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      const axiosError = err as AxiosError<ErrorResponse>;
      
      // More detailed error logging
      if (axiosError.response) {
        console.error('Error response:', {
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          data: axiosError.response.data,
          headers: axiosError.response.headers
        });
      } else if (axiosError.request) {
        console.error('Request error:', axiosError.request);
      } else {
        console.error('Error:', axiosError.message);
      }
      
      setServerError(
        axiosError.response?.data?.detail || 
        axiosError.response?.data?.message || 
        `Failed to reset password. Status: ${axiosError.response?.status || 'Unknown'}`
      );
    }
  };

  // Password strength indicators
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: '', color: '' };
    
    let score = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
    ];
    
    score = checks.filter(Boolean).length;
    
    if (score < 3) return { score, text: 'Weak', color: 'text-red-500' };
    if (score < 4) return { score, text: 'Fair', color: 'text-yellow-500' };
    if (score < 5) return { score, text: 'Good', color: 'text-blue-500' };
    return { score, text: 'Strong', color: 'text-green-500' };
  };

  const passwordStrength = getPasswordStrength(password || '');

  if (success) {
    return (
      <div className="min-h-screen section-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold brand-text">Revu</h1>
            </Link>
            <h2 className="mt-6 text-3xl font-extrabold text-primary-dark">
              Password reset successful
            </h2>
          </div>

          {/* Success Message */}
          <Card className="card-background">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary-dark">
                    Your password has been reset
                  </h3>
                  <p className="text-sm text-secondary-dark">
                    You can now sign in with your new password.
                  </p>
                </div>

                <LoadingButton
                  onClick={() => router.push('/login')}
                  className="w-full"
                  variant="default"
                >
                  Continue to sign in
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isClient || (!token && success === false)) {
    return (
      <div className="min-h-screen section-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold brand-text">Revu</h1>
            </Link>
            <h2 className="mt-6 text-3xl font-extrabold text-primary-dark">
              Loading...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen section-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold brand-text">Revu</h1>
            </Link>
            <h2 className="mt-6 text-3xl font-extrabold text-primary-dark">
              Loading...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen section-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold brand-text">Revu</h1>
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-primary-dark">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-secondary-dark">
            Enter your new password below
          </p>
        </div>

        {/* Reset Password Form */}
        <Card className="card-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-primary-dark">
              Create new password
            </CardTitle>
            <CardDescription className="text-center text-secondary-dark">
              Make sure your new password is strong and secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Hidden token field */}
              <input
                {...register('token')}
                type="hidden"
                value={token}
              />

              {/* Server Error */}
              {serverError && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{serverError}</span>
                </div>
              )}

              {/* Password Field with Strength Indicator */}
              <div className="space-y-2">
                <div className="relative">
                  <FormInput
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label="New password"
                    placeholder="Create a new password"
                    error={errors.password?.message}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-9 text-secondary-dark hover:text-primary-dark"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.score < 3 ? 'bg-red-500' :
                            passwordStrength.score < 4 ? 'bg-yellow-500' :
                            passwordStrength.score < 5 ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <ul className="text-xs text-secondary-dark space-y-1">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className={`h-3 w-3 ${password.length >= 8 ? 'text-green-500' : 'text-gray-400'}`} />
                        <span>At least 8 characters</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className={`h-3 w-3 ${/[a-z]/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                        <span>One lowercase letter</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className={`h-3 w-3 ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                        <span>One uppercase letter</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className={`h-3 w-3 ${/\d/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                        <span>One number</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="relative">
                <FormInput
                  {...register('confirmPassword')}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm new password"
                  placeholder="Confirm your new password"
                  error={errors.confirmPassword?.message}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-9 text-secondary-dark hover:text-primary-dark"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Submit Button */}
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                className="w-full"
                variant="default"
              >
                {isSubmitting ? 'Resetting password...' : 'Reset password'}
              </LoadingButton>

              {/* Back to Login */}
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center space-x-2 text-sm brand-text hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to sign in</span>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
