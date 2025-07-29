'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import { signupSchema, type SignupFormData } from '@/lib/validations/auth';
import { FormInput } from '@/components/ui/form-input';
import { LoadingButton } from '@/components/ui/loading-button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { AxiosError } from 'axios';

interface ErrorResponse {
  detail?: string;
  message?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch('password');

  const onSubmit = async (data: SignupFormData) => {
    setServerError('');

    try {
      await signup(data.email, data.password, data.fullName);
      
      // Get appropriate redirect path based on user role and access status
      const { getRedirectPath } = useAuth.getState();
      const redirectPath = getRedirectPath();
      router.push(redirectPath);
    } catch (err) {
      console.error('Signup error:', err);
      const axiosError = err as AxiosError<ErrorResponse>;
      setServerError(
        axiosError.response?.data?.detail || 
        axiosError.response?.data?.message || 
        'Failed to create account. Please try again.'
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
            Create your account
          </h2>
          <p className="mt-2 text-sm text-secondary-dark">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-medium brand-text hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Signup Form */}
        <Card className="card-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-primary-dark">
              Get started
            </CardTitle>
            <CardDescription className="text-center text-secondary-dark">
              Join thousands of businesses improving their online reputation
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

              {/* Full Name Field */}
              <FormInput
                {...register('fullName')}
                id="fullName"
                type="text"
                label="Full name"
                placeholder="Enter your full name"
                error={errors.fullName?.message}
                autoComplete="name"
              />

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

              {/* Password Field with Strength Indicator */}
              <div className="space-y-2">
                <div className="relative">
                  <FormInput
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    placeholder="Create a password"
                    error={errors.password?.message}
                    autoComplete="new-password"
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
                  label="Confirm password"
                  placeholder="Confirm your password"
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

              {/* Terms Agreement */}
              <div className="text-xs text-secondary-dark">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="brand-text hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="brand-text hover:underline">
                  Privacy Policy
                </Link>
                .
              </div>

              {/* Submit Button */}
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                className="w-full"
                variant="default"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </LoadingButton>
            </form>

            {/* Demo CTA */}
            <div className="mt-6 p-4 brand-background rounded-lg">
              <p className="text-sm text-center text-primary-dark">
                <strong>Want to see Revu first?</strong> No commitment required.
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