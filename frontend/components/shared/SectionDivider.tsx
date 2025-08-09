// frontend/components/shared/SectionDivider.tsx
'use client';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';

interface SectionDividerProps {
  className?: string;
}

export function SectionDivider({ className = '' }: SectionDividerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-50px" });

  return (
    <div ref={ref} className={`w-full py-16 ${className}`}>
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={isInView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="h-0.5 w-full bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-500 to-transparent origin-center"
      />
    </div>
  );
}
