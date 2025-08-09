// frontend/components/landing/SocialProof.tsx
'use client';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';

export function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-100px" });

  return (
    <section className="py-24 section-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="text-center max-w-4xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-primary-dark mb-8"
          >
            Our Vision
          </motion.h2>
          <div className="text-lg text-secondary-dark leading-relaxed space-y-6">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              We believe that every business deserves to have meaningful conversations with their customers. 
              In a world where online reviews and feedback shape customer decisions, maintaining authentic 
              engagement shouldn&apos;t be a burden that consumes hours of your valuable time.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Our mission is to empower businesses of all sizes to maintain their unique voice and 
              personality while leveraging the power of AI to respond faster, more consistently, and 
              more thoughtfully than ever before.
            </motion.p>
            <motion.p 
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-xl font-medium text-primary-dark"
            >
              &ldquo;Technology should amplify your humanity, not replace it.&rdquo;

            </p>
            <p className="text-sm text-muted-dark italic">
              — The Repruv Team
            </p>

          </div>
        </div>
      </div>
    </section>
  );
}