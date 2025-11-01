'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Play, Zap, Award } from 'lucide-react';
import SocialPlatformCarousel from '@/components/shared/SocialPlatformCarousel';
import { useAuth } from '@/lib/auth';
import { VideoModal } from '@/components/ui/VideoModal';

export function Hero() {
  const router = useRouter();
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-100px" });
  
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  return (
    <>
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
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold brand-text leading-tight tracking-tight mb-4">
              Automating monetisation for the creator economy.
            </h1>
            
            <p className="text-lg md:text-xl text-[var(--success)] leading-relaxed max-w-3xl mx-auto font-light">
              Help creators grow their channels and increase revenue through {' '}
              <span className="font-medium">AI-powered automation</span>, {' '}
              <span className="font-medium">monetization insights</span>, and {' '}
              <span className="font-medium">cross-platform intelligence</span>.
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
                  <h3 className="text-3xl lg:text-4xl font-bold text-[var(--success)] mb-4">
                    Join Early Access
                  </h3>
                  <p className="text-base text-[var(--success)] font-medium mb-3">
                    Start growing your channel and revenue with AI-powered tools. Free during Early Access.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center mb-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 shadow-sm hover:shadow-md transition-all duration-200">
                      <Play className="w-4 h-4" />
                      YouTube & Instagram [BETA]
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-500/10 to-teal-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50 shadow-sm hover:shadow-md transition-all duration-200">
                      <Zap className="w-4 h-4" />
                      Revenue opportunity identification
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 shadow-sm hover:shadow-md transition-all duration-200">
                      <Award className="w-4 h-4" />
                      Free during Early Access
                    </div>
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
                        className="px-8 py-4 text-lg font-bold bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                      >
                        Join Early Access
                      </Button>
                      <Button 
                        onClick={() => setVideoModalOpen(true)}
                        variant="outline"
                        className="px-8 py-4 text-lg font-bold border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-muted rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
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

      <VideoModal 
        videoId="Vzg3Ltsmmw4"
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        isShort={false}
      />
    </motion.section>
    </>
  );
}
