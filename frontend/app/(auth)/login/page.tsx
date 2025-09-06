'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { FormInput } from '@/components/ui/form-input';
import { LoadingButton } from '@/components/ui/loading-button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AxiosError } from 'axios';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { FaInstagram } from 'react-icons/fa';

interface ErrorResponse {
  detail?: string;
  message?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const {} = useStore();
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
      const email = data.email.toLowerCase();
      // Try normal backend login first
      await login(email, data.password);
      
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
      
      <div className="absolute top-4 left-4">
        <Link href="/" className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform duration-200">
            <path d="m12 19-7-7 7-7"></path>
            <path d="M19 12H5"></path>
          </svg>
          <span className="text-sm font-semibold">Back to Home</span>
        </Link>
      </div>
      
      <motion.div 
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div 
          className="text-center mb-8 w-full max-w-md mx-auto"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link href="/" className="inline-block" aria-label="Repruv home">
            <div className="flex items-center justify-center">
              <Image src="/logo/text_light.png" alt="Repruv" width={180} height={48} className="h-12 w-auto dark:hidden" priority />
              <Image src="/logo/text_dark.png" alt="Repruv" width={180} height={48} className="h-12 w-auto hidden dark:inline" priority />
            </div>
          </Link>
          <h2 className="mt-8 text-4xl md:text-5xl font-extrabold text-primary-dark bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 bg-clip-text text-transparent">
            Welcome back
          </h2>
          <p className="mt-4 text-lg text-secondary-dark">
            New to Repruv?{' '}
            <Link 
              href="/signup" 
              className="font-semibold brand-text hover:underline"
            >
              Create an account
            </Link>
          </p>
        </motion.div>

        {/* Login Form */}
        <Card className="card-background border-gray-200/50 dark:border-gray-800/50 shadow-lg backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-1 bg-gradient-to-r from-white/40 to-white/20 dark:from-gray-900/40 dark:to-gray-900/20">
            <CardTitle className="text-2xl text-center text-gray-800 dark:text-gray-200">
              Sign in to your account
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-400">
              Enter your credentials to unlock your AI-powered community engagement tools
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Server Error */}
              {serverError && (
                <motion.div 
                  className="flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{serverError}</span>
                </motion.div>
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
                className="focus:border-green-500 focus:ring-green-500/20 transition-all duration-300"
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
                  className="focus:border-green-500 focus:ring-green-500/20 transition-all duration-300"
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

              {/* Remember Me + Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Remember me
                  </label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium brand-text hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                variant="default"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </LoadingButton>
            </form>
            
            {/* Social Login Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>
            
            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                className="flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
                type="button"
                onClick={async () => {
                  try {
                    await useAuth.getState().googleLogin();
                  } catch (error) {
                    console.error('Failed to login with Google:', error);
                    setServerError('Failed to login with Google. Please try again.');
                  }
                }}
              >
                <FcGoogle className="w-5 h-5" />
                <span className="text-gray-700 dark:text-gray-300">Google</span>
              </Button>
              <Button 
                variant="outline"
                className="flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
                type="button"
                onClick={async () => {
                  try {
                    await useAuth.getState().instagramLogin();
                  } catch (error) {
                    console.error('Failed to login with Instagram:', error);
                    setServerError('Failed to login with Instagram. Please try again.');
                  }
                }}
              >
                <FaInstagram className="w-5 h-5 text-pink-600" />
                <span className="text-gray-700 dark:text-gray-300">Instagram</span>
              </Button>
            </div>
            
            {/* Sign Up Link (Mobile-friendly) */}
            <div className="text-center mt-6 sm:hidden">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="font-medium brand-text hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
