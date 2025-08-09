'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { FormInput } from '@/components/ui/form-input';
import { LoadingButton } from '@/components/ui/loading-button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { AxiosError } from 'axios';

interface ErrorResponse {
  detail?: string;
  message?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');

    try {
      await login(data.email, data.password);
      
      // Get appropriate redirect path based on user role and access status
      const { getRedirectPath } = useAuth.getState();
      const redirectPath = getRedirectPath();
      router.push(redirectPath);
    } catch (err) {
      console.error('Login error:', err);
      const axiosError = err as AxiosError<ErrorResponse>;
      setServerError(
        axiosError.response?.data?.detail || 
        axiosError.response?.data?.message || 
        'Invalid email or password. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen section-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold brand-text">Repruv</h1>
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-primary-dark">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-secondary-dark">
            Or{' '}
            <Link 
              href="/signup" 
              className="font-medium brand-text hover:underline"
            >
              create a new account
            </Link>
          </p>
        </div>

        {/* Login Form */}
        <Card className="card-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-primary-dark">
              Sign in
            </CardTitle>
            <CardDescription className="text-center text-secondary-dark">
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Server Error */}
              {serverError && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{serverError}</span>
                </div>
              )}

              {/* Email Field */}
              <FormInput
                {...register('email')}
                id="email"
                type="email"
                label="Email address"
                placeholder="Enter your email"
                error={errors.email?.message}
                autoComplete="email"
              />

              {/* Password Field */}
              <div className="relative">
                <FormInput
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  autoComplete="current-password"
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

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm brand-text hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>

              {/* Submit Button */}
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                className="w-full"
                variant="default"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </LoadingButton>
            </form>

            {/* Demo CTA */}
            <div className="mt-6 p-4 brand-background rounded-lg">
              <p className="text-sm text-center text-primary-dark">
                <strong>New to Repruv?</strong> See it in action first.
              </p>
              <div className="mt-2 text-center">
                <Link
                  href="/demo"
                  className="text-sm brand-text hover:underline font-medium"
                >
                  Schedule a free demo →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
