'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import SocialPlatformCarousel from '@/components/shared/SocialPlatformCarousel';

export function Hero() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-100px" });
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/users/waitlist/join', {
        email,
      });
      
      router.push(`/waitlist-success?user_id=${response.data.user_id}&has_account=${response.data.has_account}&email=${encodeURIComponent(email)}`);
    } catch (error: unknown) {
      console.error('Failed to get early access:', error);
      let errorMessage = 'Failed to get early access. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        errorMessage = axiosError.response?.data?.detail || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section 
      id="hero" 
      className="relative min-h-[90vh] bg-gradient-to-br from-slate-50 via-white to-blue-50/30 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Professional Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(51, 65, 85) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div ref={ref} className="relative">
          {/* Subtle Professional Background Graphics */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Minimalist Geometric Shapes */}
            <motion.div
              className="absolute top-20 left-12 opacity-8"
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 0.08, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{ duration: 2, delay: 0.5 }}
            >
              <div className="w-32 h-32 border border-blue-200 rounded-full"></div>
            </motion.div>
            
            <motion.div
              className="absolute top-40 right-16 opacity-6"
              initial={{ opacity: 0, rotate: -45 }}
              animate={isInView ? { opacity: 0.06, rotate: 0 } : { opacity: 0, rotate: -45 }}
              transition={{ duration: 2, delay: 0.8 }}
            >
              <div className="w-24 h-24 border border-green-200 rounded-lg transform rotate-12"></div>
            </motion.div>

            <motion.div
              className="absolute bottom-32 left-20 opacity-8"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 0.08, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 2, delay: 1.2 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full"></div>
            </motion.div>

            {/* Subtle Icon Representations */}
            <motion.div
              className="absolute top-32 right-8 opacity-12"
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 0.12, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{ duration: 1.5, delay: 1 }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" className="text-slate-300">
                <path fill="currentColor" d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
              </svg>
            </motion.div>

            <motion.div
              className="absolute bottom-40 right-24 opacity-10"
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 0.1, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{ duration: 1.5, delay: 1.5 }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" className="text-slate-300">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
              </svg>
            </motion.div>
          </div>

          <motion.div 
            className="text-center mb-8 relative z-10"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-4">
              <div className="flex items-center justify-center gap-4 mb-2">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                  transition={{ duration: 0.8, delay: 0.4, type: "spring", bounce: 0.5 }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex-shrink-0"
                >
                  <div className="relative w-20 h-18">
                    {/* Heart for Likes - Top of triangle */}
                    <motion.div
                      className="absolute top-0 left-1/2 transform -translate-x-1/2"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                      transition={{ duration: 0.6, delay: 0.4, type: "spring", bounce: 0.5 }}
                      whileHover={{ scale: 1.3 }}
                    >
                      <motion.svg 
                        width="32" 
                        height="32" 
                        viewBox="0 0 24 24" 
                        className="text-red-500"
                        style={{
                          filter: 'drop-shadow(0 4px 8px rgba(239, 68, 68, 0.5))'
                        }}
                        animate={{ 
                          y: [0, -4, 0],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </motion.svg>
                    </motion.div>

                    {/* Comment Bubble - Bottom left of triangle */}
                    <motion.div
                      className="absolute bottom-0 left-1"
                      initial={{ scale: 0, y: 20 }}
                      animate={isInView ? { scale: 1, y: 0 } : { scale: 0, y: 20 }}
                      transition={{ duration: 0.6, delay: 0.5, type: "spring", bounce: 0.4 }}
                      whileHover={{ scale: 1.3 }}
                    >
                      <motion.svg 
                        width="32" 
                        height="32" 
                        viewBox="0 0 24 24" 
                        className="text-blue-500"
                        style={{
                          filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.5))'
                        }}
                        animate={{ 
                          y: [0, -3, 0],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.5
                        }}
                      >
                        <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l3 3 3-3h6c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 12H7v-2h10v2zm0-4H7V8h10v2zm0-4H7V4h10v2z"/>
                      </motion.svg>
                    </motion.div>

                    {/* View Counter - Bottom right of triangle */}
                    <motion.div
                      className="absolute bottom-0 right-1"
                      initial={{ scale: 0, rotate: 180 }}
                      animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: 180 }}
                      transition={{ duration: 0.6, delay: 0.6, type: "spring", bounce: 0.3 }}
                      whileHover={{ scale: 1.3 }}
                    >
                      <motion.svg 
                        width="32" 
                        height="32" 
                        viewBox="0 0 24 24" 
                        className="text-purple-500"
                        style={{
                          filter: 'drop-shadow(0 4px 8px rgba(147, 51, 234, 0.5))'
                        }}
                        animate={{ 
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 1
                        }}
                      >
                        <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </motion.svg>
                    </motion.div>
                  </div>
                </motion.div>
                <span className="block">Increase Engagement.</span>
              </div>
              <div className="flex items-center justify-center gap-4 mb-2">
                <motion.div
                  initial={{ scale: 0, y: -20 }}
                  animate={isInView ? { scale: 1, y: 0 } : { scale: 0, y: -20 }}
                  transition={{ duration: 0.8, delay: 0.6, type: "spring", bounce: 0.4 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="flex-shrink-0"
                >
                  <div className="flex items-center gap-3">
                    {/* Trending Arrow for Growth */}
                    <motion.div
                      initial={{ scale: 0, y: -20 }}
                      animate={isInView ? { scale: 1, y: 0 } : { scale: 0, y: -20 }}
                      transition={{ duration: 0.6, delay: 0.6, type: "spring", bounce: 0.4 }}
                      whileHover={{ scale: 1.3 }}
                    >
                      <motion.svg 
                        width="40" 
                        height="40" 
                        viewBox="0 0 24 24" 
                        className="text-blue-600"
                        style={{
                          filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.5))'
                        }}
                        animate={{ 
                          y: [0, -4, 0],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.5
                        }}
                      >
                        <path fill="currentColor" d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                      </motion.svg>
                    </motion.div>

                    {/* Bar Chart for Analytics */}
                    <motion.div
                      initial={{ scale: 0, x: -20 }}
                      animate={isInView ? { scale: 1, x: 0 } : { scale: 0, x: -20 }}
                      transition={{ duration: 0.6, delay: 0.7, type: "spring", bounce: 0.3 }}
                      whileHover={{ scale: 1.3 }}
                    >
                      <motion.svg 
                        width="40" 
                        height="40" 
                        viewBox="0 0 24 24" 
                        className="text-indigo-600"
                        style={{
                          filter: 'drop-shadow(0 4px 8px rgba(99, 102, 241, 0.5))'
                        }}
                        animate={{ 
                          y: [0, -3, 0],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.8
                        }}
                      >
                        <path fill="currentColor" d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
                      </motion.svg>
                    </motion.div>


                  </div>
                </motion.div>
                <span className="block text-blue-600">Drive Growth.</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: 180 }}
                  animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: 180 }}
                  transition={{ duration: 0.8, delay: 0.8, type: "spring", bounce: 0.3 }}
                  whileHover={{ scale: 1.3 }}
                  className="flex-shrink-0"
                >
                  <motion.svg 
                    width="48" 
                    height="48" 
                    viewBox="0 0 24 24" 
                    className="text-green-600"
                    style={{
                      filter: 'drop-shadow(0 4px 8px rgba(34, 197, 94, 0.5))'
                    }}
                    animate={{ 
                      y: [0, -3, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.9
                    }}
                  >
                    <defs>
                      <linearGradient id="billGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22c55e"/>
                        <stop offset="50%" stopColor="#16a34a"/>
                        <stop offset="100%" stopColor="#15803d"/>
                      </linearGradient>
                    </defs>
                    {/* Bill outline */}
                    <rect x="1" y="6" width="22" height="12" rx="1" fill="url(#billGradient)" stroke="#065f46" strokeWidth="0.5"/>
                    {/* Decorative border */}
                    <rect x="2" y="7" width="20" height="10" rx="0.5" fill="none" stroke="#dcfce7" strokeWidth="0.3" strokeDasharray="0.5,0.5"/>
                    {/* Center circle - blank note */}
                    <circle cx="12" cy="12" r="3" fill="#dcfce7" fillOpacity="0.3"/>
                    {/* Corner decorative elements */}
                    <circle cx="4" cy="9" r="0.8" fill="#dcfce7" fillOpacity="0.6"/>
                    <circle cx="20" cy="9" r="0.8" fill="#dcfce7" fillOpacity="0.6"/>
                    <circle cx="4" cy="15" r="0.8" fill="#dcfce7" fillOpacity="0.6"/>
                    <circle cx="20" cy="15" r="0.8" fill="#dcfce7" fillOpacity="0.6"/>
                    {/* Serial number style decoration */}
                    <rect x="3" y="16.5" width="6" height="0.5" fill="#065f46" fillOpacity="0.4"/>
                    <rect x="15" y="16.5" width="6" height="0.5" fill="#065f46" fillOpacity="0.4"/>
                  </motion.svg>
                </motion.div>
                <span className="block text-green-600">Boost Monetisation.</span>
              </div>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-light">
              Transform your <span className="text-slate-900 font-medium">social media engagement</span> with <span className="text-slate-900 font-medium">intelligent automation</span>, {' '}
              <span className="text-blue-600 font-medium">drive growth</span> with <span className="text-blue-600 font-medium">actionable AI-driven insights</span>, and {' '}
              <span className="text-green-600 font-medium">boost monetisation</span> with <span className="text-green-600 font-medium">strategic reports</span>.
            </p>
          </motion.div>
          
          <motion.div 
            className="mb-6 relative z-10"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <SocialPlatformCarousel />
          </motion.div>
        </div>
        
        <motion.div 
          className="relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-3 lg:p-4 shadow-2xl border border-slate-200/70 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/40 via-blue-50/20 to-green-50/40"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-400 to-green-400 opacity-60"></div>
              
              <div className="relative z-10">
                <div className="text-center mb-2">
                  <h3 className="text-3xl lg:text-4xl font-bold text-green-600 mb-4">
                    Get Early Access
                  </h3>
                      <p className="text-base text-primary-dark/80 dark:text-gray-300 font-['Poppins',sans-serif] font-medium mb-3">
                        We’re in prelaunch. Share your email and we’ll notify you early when access opens.
                      </p>
                  <div className="flex flex-wrap gap-3 justify-center mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      🚀 Early Access
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      🔒 Secure &amp; Private
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      💎 Free Creator Use
                    </span>
                  </div>
                </div>
                
                <motion.div 
                  className="w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  <form onSubmit={handleEmailSubmit} className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <div className="relative group flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-slate-400 group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-12 pr-4 py-3 text-base border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all duration-300 bg-white/95 backdrop-blur-sm text-slate-900 placeholder:text-slate-500 shadow-sm hover:shadow-md group-hover:border-green-400"
                          disabled={loading}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={loading || !email.trim()} 
                        className="sm:w-auto px-6 py-3 text-base font-bold bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 whitespace-nowrap"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          'Get Early Access'
                        )}
                      </Button>
                    </div>
                    

                      
                      {error && (
                        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">
                          <AlertCircle className="h-4 w-4" />
                          <span>{error}</span>
                        </div>
                      )}
                      
                      <div className="text-center sm:text-left">
                        <p className="text-sm text-primary-dark/60 dark:text-gray-400 font-['Poppins',sans-serif]">
                          We’re in prelaunch — drop your email and we’ll notify you early when access opens
                        </p>
                      </div>
                  </form>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <motion.div 
        className="absolute top-0 right-0 -z-10 transform translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.0 }}
      >
        <div className="w-96 h-96 brand-background rounded-full opacity-20 blur-3xl"></div>
      </motion.div>
    </motion.section>
  );
}
