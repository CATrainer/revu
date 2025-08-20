// frontend/components/landing/SocialProof.tsx
'use client';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';

export function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-100px" });

  return (
    <motion.section 
      id="vision" 
      className="py-24 section-background-alt"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Title */}
        <motion.h2 
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.8 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-3xl md:text-4xl font-bold brand-text mb-16 text-center font-['Poppins',sans-serif]"
        >
          Our Vision
        </motion.h2>

        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Video Section - Left Side */}
          <motion.div 
            initial={{ opacity: 0, x: -80, rotate: -5 }}
            animate={isInView ? { opacity: 1, x: 0, rotate: 0 } : { opacity: 0, x: -80, rotate: -5 }}
            transition={{ duration: 1.0, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex justify-center lg:justify-start"
          >
            <motion.div 
              className="relative w-full max-w-md aspect-video bg-gradient-to-br from-[var(--muted)] to-[var(--secondary)] dark:from-[var(--secondary)] dark:to-[var(--muted)] rounded-xl shadow-lg flex items-center justify-center"
              whileHover={{ scale: 1.02, rotate: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Placeholder for video */}
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <motion.div 
                  className="w-16 h-16 mx-auto mb-4 bg-[var(--card)] dark:bg-[var(--secondary)] rounded-full flex items-center justify-center shadow-md"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                  </svg>
                </motion.div>
                <motion.p 
                  className="text-sm text-gray-600 dark:text-gray-300 font-medium"
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                >
                  Trailer Video
                </motion.p>
                <motion.p 
                  className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  Coming Soon
                </motion.p>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Content Section - Right Side */}
          <motion.div 
            initial={{ opacity: 0, x: 80 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 80 }}
            transition={{ duration: 1.0, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="lg:pl-8"
          >
            
            <div className="text-lg text-primary-dark leading-relaxed space-y-6 font-['Poppins',sans-serif] font-bold">
              <motion.p
                initial={{ opacity: 0, y: 30, x: 20 }}
                animate={isInView ? { opacity: 1, y: 0, x: 0 } : { opacity: 0, y: 30, x: 20 }}
                transition={{ duration: 0.8, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                At Repruv, we believe every creator, brand, and business deserves an authentic and manageable online reputation. In today&apos;s digital world, feedback shapes decisions — and managing it shouldn&apos;t consume your time.
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 30, x: 20 }}
                animate={isInView ? { opacity: 1, y: 0, x: 0 } : { opacity: 0, y: 30, x: 20 }}
                transition={{ duration: 0.8, delay: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                Repruv empowers users to monitor, analyze, respond, engage, protect, and report on reviews and social feedback, using AI to streamline tasks while keeping your unique voice. By transforming feedback into actionable insights and advocacy, we help build trust, strengthen relationships, and drive growth.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.9, rotate: -2 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1, rotate: 0 } : { opacity: 0, y: 40, scale: 0.9, rotate: -2 }}
                transition={{ duration: 0.8, delay: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ scale: 1.02, rotate: 1 }}
                className="bg-gradient-to-r from-[var(--muted)] to-[var(--secondary)] dark:from-[var(--secondary)] dark:to-[var(--muted)] p-6 rounded-lg border-l-4 border-[var(--brand-primary)]"
              >
                <motion.p 
                  className="text-xl font-bold text-primary-dark mb-2 font-['Poppins',sans-serif]"
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.6, delay: 1.4 }}
                >
                  &ldquo;Your reputation, managed intelligently. Your voice, amplified authentically.&rdquo;
                </motion.p>
                <motion.p 
                  className="text-sm text-primary-dark italic font-['Poppins',sans-serif] font-bold"
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.6, delay: 1.6 }}
                >
                  — The Repruv Team
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}