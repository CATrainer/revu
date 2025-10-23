'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export function EarlyAccessBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed in the last 7 days
    const dismissed = localStorage.getItem('earlyAccessBannerDismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    
    if (!dismissed || Date.now() - dismissedTime > sevenDaysInMs) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('earlyAccessBannerDismissed', Date.now().toString());
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full bg-holo-purple shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              {/* Desktop text */}
              <Link 
                href="/#early-access"
                className="hidden md:flex items-center gap-2 flex-1 justify-center hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span className="text-lg">🚀</span>
                <span className="font-bold text-sm md:text-base drop-shadow-md">
                  Now in Early Access - Join creators building the future of social monetization
                </span>
                <span className="text-sm font-semibold drop-shadow-md hidden lg:inline">
                  | Limited spots available
                </span>
              </Link>

              {/* Mobile text */}
              <Link 
                href="/#early-access"
                className="flex md:hidden items-center gap-2 flex-1 justify-center hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span className="text-lg">🚀</span>
                <span className="font-bold text-sm drop-shadow-md">
                  Early Access - Join Now
                </span>
              </Link>

              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
