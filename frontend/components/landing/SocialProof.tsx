// frontend/components/landing/SocialProof.tsx
'use client';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';

export function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-100px" });

  return (
    <section className="py-24 section-background-alt">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Video Section - Left Side */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center lg:justify-start"
          >
            <div className="relative w-full max-w-md aspect-video bg-gradient-to-br from-[var(--muted)] to-[var(--secondary)] dark:from-[var(--secondary)] dark:to-[var(--muted)] rounded-xl shadow-lg flex items-center justify-center">
              {/* Placeholder for video */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--card)] dark:bg-[var(--secondary)] rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Trailer Video</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coming Soon</p>
              </div>
              
              {/* Video element (hidden until video is added) */}
              {/* 
              <video 
                className="w-full h-full object-cover rounded-xl"
                controls
                poster="/trailer-thumbnail.jpg"
              >
                <source src="/trailer-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              */}
            </div>
          </motion.div>

          {/* Content Section - Right Side */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:pl-8"
          >
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-3xl md:text-4xl font-bold text-primary-dark mb-8 text-center"
            >
              Our Vision
            </motion.h2>
            
            <div className="text-lg text-secondary-dark leading-relaxed space-y-6">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                We believe that every business deserves to have meaningful conversations with their customers. 
                In a world where online reviews and feedback shape customer decisions, maintaining authentic 
                engagement shouldn&apos;t be a burden that consumes hours of your valuable time.
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                Our mission is to empower businesses of all sizes to maintain their unique voice and 
                personality while leveraging the power of AI to respond faster, more consistently, and 
                more thoughtfully than ever before.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                className="bg-gradient-to-r from-[var(--muted)] to-[var(--secondary)] dark:from-[var(--secondary)] dark:to-[var(--muted)] p-6 rounded-lg border-l-4 border-[var(--brand-primary)]"
              >
                <p className="text-xl font-medium text-primary-dark mb-2">
                  &ldquo;Technology should amplify your humanity, not replace it.&rdquo;
                </p>
                <p className="text-sm text-muted-dark italic">
                  — The Repruv Team
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}