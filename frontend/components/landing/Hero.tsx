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
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-primary-dark leading-tight tracking-tight mb-4">
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="block">Increase Engagement.</span>
              </div>
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="block text-holo-teal">Drive Growth.</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="block text-holo-mint">Boost Monetisation.</span>
              </div>
            </h1>
            
            <p className="text-lg md:text-xl text-secondary-dark leading-relaxed max-w-3xl mx-auto font-light">
              Help creators grow their channels and increase revenue through {' '}
              <span className="text-primary-dark font-medium">AI-powered automation</span>, {' '}
              <span className="text-holo-teal font-medium">monetization insights</span>, and {' '}
              <span className="text-holo-mint font-medium">cross-platform intelligence</span>.
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
            <div className="glass-panel backdrop-blur-xl rounded-3xl p-3 lg:p-4 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-holo-mint/10 via-holo-teal/10 to-holo-mint/10"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-holo-mint via-holo-teal to-holo-mint opacity-60"></div>
              
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <h3 className="text-3xl lg:text-4xl font-bold text-holo-mint mb-4">
                    Join Early Access
                  </h3>
                  <p className="text-base text-secondary-dark font-medium mb-3">
                    Start growing your channel and revenue with AI-powered tools. Free during Early Access.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-holo-mint border border-border">
                      ✓ YouTube & Instagram [BETA]
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-holo-teal border border-border">
                      ✓ Revenue opportunity identification
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-holo-purple border border-border">
                      ✓ Free during Early Access
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
                      className="px-8 py-4 text-lg font-bold bg-brand-primary hover:bg-holo-teal text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      Go to Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={() => router.push('/signup')}
                        className="px-8 py-4 text-lg font-bold bg-holo-mint hover:bg-holo-mint-dark text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                      >
                        Join Early Access
                      </Button>
                      <Button 
                        onClick={() => router.push('/features')}
                        variant="outline"
                        className="px-8 py-4 text-lg font-bold border-2 border-holo-mint text-holo-mint hover:bg-muted rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
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
