'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { BetaBadge } from '@/components/ui/BetaBadge';
import { FaYoutube, FaInstagram, FaTiktok, FaLinkedin } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

export function PlatformSupport() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const availablePlatforms = [
    { name: 'YouTube', icon: FaYoutube, color: 'text-red-600' },
    { name: 'Instagram', icon: FaInstagram, color: 'text-pink-600' },
  ];

  const comingSoonPlatforms = [
    { name: 'TikTok', timeline: 'December 2025', icon: FaTiktok, color: 'text-black dark:text-white' },
    { name: 'X', timeline: 'December 2025', icon: FaXTwitter, color: 'text-black dark:text-white' },
    { name: 'LinkedIn', timeline: 'Q1 2026', icon: FaLinkedin, color: 'text-blue-700' },
  ];

  return (
    <motion.section 
      ref={ref}
      className="py-16 md:py-24 section-background"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold brand-text mb-4">
            Supported Platforms
          </h2>
          <p className="text-lg text-[var(--success)] max-w-2xl mx-auto font-bold">
            Start with YouTube and Instagram today. More platforms to be supported soon.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Available Now */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Check className="w-6 h-6 text-holo-mint" />
              <h3 className="text-2xl font-bold brand-text">Available Now</h3>
              <BetaBadge variant="blue" />
            </div>
            <div className="space-y-4">
              {availablePlatforms.map((platform, index) => (
                <motion.div
                  key={platform.name}
                  className="flex items-center gap-4 p-4 rounded-2xl card-background border border-[var(--border)]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[var(--muted)] to-transparent">
                    <platform.icon className={`w-6 h-6 ${platform.color}`} />
                  </div>
                  <div>
                    <span className="text-lg font-semibold text-primary-dark block">{platform.name}</span>
                    <span className="text-sm text-secondary-dark">Live today</span>
                  </div>
                  <div className="ml-auto text-[var(--success)]">
                    <Check className="w-5 h-5" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Coming Soon */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-holo-purple" />
              <h3 className="text-2xl font-bold brand-text">Coming Soon</h3>
            </div>
            <div className="space-y-4">
              {comingSoonPlatforms.map((platform, index) => (
                <motion.div
                  key={platform.name}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-dashed border-[var(--border)]/60 bg-[var(--card)]/40"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 0.7, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[var(--secondary)] to-transparent">
                    <platform.icon className={`w-6 h-6 ${platform.color}`} />
                  </div>
                  <div className="flex-1">
                    <span className="text-lg font-semibold text-primary-dark block">{platform.name}</span>
                    <span className="text-sm text-secondary-dark">Arriving {platform.timeline}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-secondary-dark flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      In progress
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.p
          className="text-center mt-8 text-secondary-dark"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          More platforms added regularly based on community feedback
        </motion.p>
      </div>
    </motion.section>
  );
}
