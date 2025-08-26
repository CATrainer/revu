// frontend/components/landing/Hero.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DashboardPreview } from '@/components/landing/DashboardPreview';

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-100px" });

  const scrollToForm = () => {
    const formElement = document.getElementById('early-access-form');
    if (formElement) {
      formElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <motion.section 
      id="hero" 
      className="relative section-background-alt py-24 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="text-center">
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-dark mb-6 font-['Poppins',sans-serif]"
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="brand-text">Reputation Management Made Simple</span>
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-primary-dark mb-8 max-w-3xl mx-auto font-['Poppins',sans-serif] font-bold"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            For brands, creators & agencies : Manage reviews, engage your audience, and turn your insights — plus competitor data — into action with our AI-powered dashboard.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" className="button-primary py-4 px-8 text-lg font-semibold" onClick={scrollToForm}>
                Get Early Access
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" className="button-secondary py-4 px-8 text-lg font-semibold" asChild>
                <Link href="/join-waitlist">Join Waitlist</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Animated dashboard preview */}
        <motion.div 
          className="mt-16 relative"
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
          transition={{ duration: 1.0, delay: 0.8 }}
        >
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="relative rounded-lg shadow-2xl overflow-hidden transform transition-transform hover:scale-[1.01]"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <DashboardPreview />
            </motion.div>
            
            {/* Subtle gradient overlay using semantic backgrounds */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--background)] via-[color-mix(in oklab,var(--background) 20%,transparent)] to-transparent pointer-events-none"></div>
          </div>
        </motion.div>
      </div>
      
      {/* Animated background decoration */}
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