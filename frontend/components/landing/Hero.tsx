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
import { CountdownBanner } from '@/components/shared/CountdownBanner';
import { useAuth } from '@/lib/auth';

export function Hero() {
  const router = useRouter();
  const { user } = useAuth();
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
    <>
      <CountdownBanner />
      <motion.section 
        id="hero" 
        className="relative min-h-[90vh] section-background overflow-hidden"
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


          <motion.div 
            className="text-center mb-8 relative z-10"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="block">Increase Engagement.</span>
              </div>
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="block text-blue-600 dark:text-blue-400">Drive Growth.</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="block text-green-600 dark:text-green-400">Boost Monetisation.</span>
              </div>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto font-light">
              Transform your <span className="text-slate-900 dark:text-white font-medium">social media engagement</span> with <span className="text-slate-900 dark:text-white font-medium">intelligent automation</span>, {' '}
              <span className="text-blue-600 dark:text-blue-400 font-medium">drive growth</span> with <span className="text-blue-600 dark:text-blue-400 font-medium">actionable AI-driven insights</span>, and {' '}
              <span className="text-green-600 dark:text-green-400 font-medium">boost monetisation</span> with <span className="text-green-600 dark:text-green-400 font-medium">strategic reports</span>.
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
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-3 lg:p-4 shadow-2xl border border-slate-200/70 dark:border-gray-700/70 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/40 via-blue-50/20 to-green-50/40 dark:from-green-900/20 dark:via-blue-900/10 dark:to-green-900/20"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-400 to-green-400 opacity-60"></div>
              
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <h3 className="text-3xl lg:text-4xl font-bold text-green-600 mb-4">
                    Get Started Today
                  </h3>
                  <p className="text-base text-primary-dark/80 dark:text-gray-300 font-['Poppins',sans-serif] font-medium mb-3">
                    Join Repruv and start automating your social media engagement with AI-powered tools.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                      🚀 Now Live
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                      🔒 Secure &amp; Private
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                      💎 Free Creator Use
                    </span>
                  </div>
                </div>
                
                <motion.div 
                  className="w-full flex flex-col sm:flex-row gap-4 justify-center items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  {user ? (
                    <Button 
                      onClick={() => router.push('/dashboard')}
                      className="px-8 py-4 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      Go to Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={() => router.push('/signup')}
                        className="px-8 py-4 text-lg font-bold bg-green-600 hover:bg-green-700 text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                      >
                        Get Started Free
                      </Button>
                      <Button 
                        onClick={() => router.push('/features')}
                        variant="outline"
                        className="px-8 py-4 text-lg font-bold border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Learn More
                      </Button>
                    </>
                  )}
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
    </>
  );
}
