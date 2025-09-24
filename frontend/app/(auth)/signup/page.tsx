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
      
      // During prelaunch, send users to the same thank-you screen as waitlist
      router.push(`/waitlist-success?has_account=true&email=${encodeURIComponent(data.email)}`);
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
    <div className="min-h-screen section-background flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
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
          className="text-center mb-4 w-full max-w-md mx-auto"
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
          <h2 className="mt-6 text-4xl font-extrabold text-primary-dark bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 bg-clip-text text-transparent">
            Create Your Account
          </h2>
          <p className="mt-2 text-base text-secondary-dark">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-semibold brand-text hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </motion.div>

        {/* Signup Form */}
        <Card className="card-background border-gray-200/50 dark:border-gray-800/50 shadow-lg backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-1 py-4 bg-gradient-to-r from-white/40 to-white/20 dark:from-gray-900/40 dark:to-gray-900/20">
            <CardTitle className="text-xl text-center text-gray-800 dark:text-gray-200">
              Get started
            </CardTitle>
            <CardDescription className="text-center text-sm text-gray-600 dark:text-gray-400">
              Enter your credentials to unlock your AI-powered community engagement tools
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
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

              {/* Full Name Field */}
              <FormInput
                {...register('fullName')}
                id="fullName"
                type="text"
                label="Full name"
                placeholder="Enter your full name"
                error={errors.fullName?.message}
                autoComplete="name"
                className="focus:border-green-500 focus:ring-green-500/20 transition-all duration-300"
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
                className="focus:border-green-500 focus:ring-green-500/20 transition-all duration-300"
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
                
                {/* Password Strength Indicator */}
                {password && (
                  <motion.div 
                    className="space-y-1"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 section-background-alt rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.score < 3 ? 'status-danger-bg' :
                            passwordStrength.score < 4 ? 'status-warning-bg' :
                            passwordStrength.score < 5 ? 'status-info-bg' : 'status-success-bg'
                          }`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0">
                      <div className="flex items-center space-x-1">
                        <CheckCircle className={`h-3 w-3 ${password.length >= 8 ? 'status-success' : 'text-muted-dark'}`} />
                        <span className="text-xs text-secondary-dark">8+ characters</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className={`h-3 w-3 ${/[a-z]/.test(password) ? 'status-success' : 'text-muted-dark'}`} />
                        <span className="text-xs text-secondary-dark">Lowercase</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className={`h-3 w-3 ${/[A-Z]/.test(password) ? 'status-success' : 'text-muted-dark'}`} />
                        <span className="text-xs text-secondary-dark">Uppercase</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className={`h-3 w-3 ${/\d/.test(password) ? 'status-success' : 'text-muted-dark'}`} />
                        <span className="text-xs text-secondary-dark">Number</span>
                      </div>
                    </div>
                  </motion.div>
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
                  className="focus:border-green-500 focus:ring-green-500/20 transition-all duration-300"
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
                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                variant="default"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </LoadingButton>
            </form>
            
            {/* Social Login Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  Or sign up with
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
                    console.error('Failed to sign up with Google:', error);
                    setServerError('Failed to sign up with Google. Please try again.');
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
                    console.error('Failed to sign up with Instagram:', error);
                    setServerError('Failed to sign up with Instagram. Please try again.');
                  }
                }}
              >
                <FaInstagram className="w-5 h-5 text-pink-600" />
                <span className="text-gray-700 dark:text-gray-300">Instagram</span>
              </Button>
            </div>

            {/* Prelaunch CTA */}
            <div className="mt-3 p-2 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded-lg border border-green-200/50 dark:border-green-800/20 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-800 dark:text-gray-200">
                  <strong>We’re in prelaunch.</strong>
                </p>
                <Link
                  href="/join-waitlist"
                  className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium"
                >
                  Join the waitlist →
                </Link>
              </div>
            </div>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}