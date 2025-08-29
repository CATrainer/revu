// frontend/components/shared/ScrollNavigation.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Section {
  id: string;
  name: string;
}

const sections: Section[] = [
  { id: 'hero', name: 'Home' },
  { id: 'features', name: 'Features' },
  { id: 'vision', name: 'Vision' }
];

export function ScrollNavigation() {
  const [currentSection, setCurrentSection] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollPosition = window.scrollY + window.innerHeight / 2;
          
          // Show navigation after scrolling a bit
          setIsVisible(window.scrollY > 200);
          
          // Find current section based on scroll position with buffer
          for (let i = sections.length - 1; i >= 0; i--) {
            const element = document.getElementById(sections[i].id);
            if (element && element.offsetTop - 100 <= scrollPosition) {
              setCurrentSection(i);
              break;
            }
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (index: number) => {
    const element = document.getElementById(sections[index].id);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50"
        >
          {/* Main Navigation Container */}
          <div className="relative">
            {/* Vertical Progress Track */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-600 opacity-30" />
            
            {/* Active Progress Line */}
            <motion.div
              className="absolute left-1/2 transform -translate-x-1/2 w-0.5 bg-gradient-to-b from-[var(--brand-primary-solid)] to-[var(--brand-secondary-solid)] shadow-sm"
              initial={{ height: 0, top: 0 }}
              animate={{ 
                height: `${(100 / Math.max(1, sections.length - 1)) * currentSection}%`,
                top: '0%'
              }}
              transition={{ 
                duration: 0.8, 
                ease: [0.25, 0.1, 0.25, 1],
                type: "tween"
              }}
            />

            {/* Navigation Dots */}
            <div className="relative flex flex-col space-y-8">
              {sections.map((section, index) => (
                <div key={section.id} className="relative flex items-center group">
                  {/* Section Label */}
                  <motion.div
                    initial={{ opacity: 0, x: 15, scale: 0.9 }}
                    whileHover={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  >
                    <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {section.name}
                      </span>
                      {/* Enhanced Tooltip Arrow */}
                      <div className="absolute left-full top-1/2 transform -translate-y-1/2">
                        <div className="w-0 h-0 border-l-[8px] border-l-white/95 dark:border-l-gray-900/95 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent" />
                        <div className="absolute -left-px top-0 w-0 h-0 border-l-[8px] border-l-gray-200/50 dark:border-l-gray-700/50 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Navigation Dot */}
                  <motion.button
                    onClick={() => scrollToSection(index)}
                    className="relative flex items-center justify-center w-6 h-6 transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    {/* Outer Ring */}
                    <motion.div
                      className={`absolute inset-0 rounded-full border transition-all duration-200 ${
                        index === currentSection
                          ? 'border-[var(--brand-primary-solid)] bg-[var(--brand-primary-solid)]/10'
                          : 'border-gray-300 dark:border-gray-600 group-hover:border-[var(--brand-primary-solid)]/60'
                      }`}
                      animate={{
                        scale: index === currentSection ? 1 : 0.85,
                        borderWidth: index === currentSection ? 2 : 1
                      }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                    
                    {/* Inner Dot */}
                    <motion.div
                      className={`relative w-2 h-2 rounded-full transition-colors duration-200 ${
                        index === currentSection
                          ? 'bg-[var(--brand-primary-solid)] shadow-sm'
                          : 'bg-gray-400 dark:bg-gray-500 group-hover:bg-[var(--brand-primary-solid)]'
                      }`}
                      animate={{
                        scale: index === currentSection ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                    
                    {/* Active Pulse Effect */}
                    {index === currentSection && (
                      <motion.div
                        className="absolute inset-0 rounded-full border border-[var(--brand-primary-solid)]/30"
                        animate={{
                          scale: [1, 1.8],
                          opacity: [0.4, 0]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeOut",
                          repeatDelay: 0.5
                        }}
                      />
                    )}
                  </motion.button>
                </div>
              ))}
            </div>

            {/* Floating Progress Indicator */}
            <motion.div
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
            >
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                <motion.span
                  className="text-xs font-bold text-[var(--brand-primary-solid)]"
                  key={currentSection}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {currentSection + 1}/{sections.length}
                </motion.span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
