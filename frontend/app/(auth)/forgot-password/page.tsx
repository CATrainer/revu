'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth';
import { FormInput } from '@/components/ui/form-input';
import { LoadingButton } from '@/components/ui/loading-button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';

interface ErrorResponse {
  detail?: string;
  message?: string;
}

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError('');
    setSuccess(false);

    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      const axiosError = err as AxiosError<ErrorResponse>;
      setServerError(
        axiosError.response?.data?.detail || 
        axiosError.response?.data?.message || 
        'Failed to send reset email. Please try again.'
      );
    }
  };

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
              Check your email
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
                    Password reset email sent
                  </h3>
                  <p className="text-sm text-secondary-dark">
                    We&apos;ve sent a password reset link to{' '}
                    <span className="font-medium text-primary-dark">
                      {getValues('email')}
                    </span>
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-secondary-dark">
                    Didn&apos;t receive the email? Check your spam folder or{' '}
                    <button
                      onClick={() => setSuccess(false)}
                      className="brand-text hover:underline font-medium"
                    >
                      try again
                    </button>
                    .
                  </p>

                  <Link
                    href="/login"
                    className="inline-flex items-center space-x-2 text-sm brand-text hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to sign in</span>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
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
            Forgot your password?
          </h2>
          <p className="mt-2 text-sm text-secondary-dark">
            No worries! Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {/* Forgot Password Form */}
        <Card className="card-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-primary-dark">
              Reset password
            </CardTitle>
            <CardDescription className="text-center text-secondary-dark">
              We&apos;ll send you a secure link to reset your password
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
                placeholder="Enter your email address"
                error={errors.email?.message}
                autoComplete="email"
                autoFocus
              />

              {/* Submit Button */}
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                className="w-full"
                variant="default"
              >
                {isSubmitting ? 'Sending link...' : 'Send reset link'}
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

            {/* Help Section */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-secondary-dark text-center">
                <strong>Need help?</strong> Contact our support team at{' '}
                <a href="mailto:support@revu.com" className="brand-text hover:underline">
                  support@revu.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
