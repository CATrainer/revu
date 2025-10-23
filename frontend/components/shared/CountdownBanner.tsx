'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';

export function CountdownBanner() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Target date: October 7th, 2025 at 12:00 PM UK time
    const targetDate = new Date('2025-10-07T12:00:00+01:00'); // UK timezone (BST)
    
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
        setIsExpired(false);
      } else {
        setIsExpired(true);
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gradient-to-r from-holo-purple via-holo-mint to-holo-teal text-white py-2 px-4 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex items-center justify-center gap-2 text-sm font-medium">
          <Calendar className="w-4 h-4" />
          <span>🎉 We&apos;re Live! Join the future of social media management</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-r from-holo-purple via-holo-mint to-holo-teal text-white py-3 px-4 text-center relative overflow-hidden"
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="font-bold">🚀 Launch Countdown</span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="flex items-center gap-1 bg-white/20 rounded px-2 py-1 backdrop-blur-sm">
              <span className="font-bold text-lg">{timeLeft.days}</span>
              <span className="text-xs">days</span>
            </div>
            <span className="text-white/80">:</span>
            <div className="flex items-center gap-1 bg-white/20 rounded px-2 py-1 backdrop-blur-sm">
              <span className="font-bold text-lg">{timeLeft.hours.toString().padStart(2, '0')}</span>
              <span className="text-xs">hrs</span>
            </div>
            <span className="text-white/80">:</span>
            <div className="flex items-center gap-1 bg-white/20 rounded px-2 py-1 backdrop-blur-sm">
              <span className="font-bold text-lg">{timeLeft.minutes.toString().padStart(2, '0')}</span>
              <span className="text-xs">min</span>
            </div>
            <span className="text-white/80">:</span>
            <div className="flex items-center gap-1 bg-white/20 rounded px-2 py-1 backdrop-blur-sm">
              <span className="font-bold text-lg">{timeLeft.seconds.toString().padStart(2, '0')}</span>
              <span className="text-xs">sec</span>
            </div>
          </div>
          
          <span className="text-xs sm:text-sm opacity-90">until launch (12pm UK)</span>
        </div>
      </div>
    </motion.div>
  );
}
