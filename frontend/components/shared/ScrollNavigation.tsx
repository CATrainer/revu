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
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2;
      
      // Show navigation after scrolling a bit
      setIsVisible(window.scrollY > 200);
      
      // Find current section based on scroll position
      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          setCurrentSection(i);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
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
          className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50"
        >
          {/* Navigation Container with Background */}
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
            <div className="flex flex-col items-center space-y-6">
              {sections.map((section, index) => (
                <div key={section.id} className="relative flex items-center group">
                  {/* Section Label */}
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    className="absolute right-12 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none"
                  >
                    <div className="bg-gray-900 dark:bg-white px-3 py-2 rounded-lg shadow-lg">
                      <span className="text-sm font-medium text-white dark:text-gray-900 whitespace-nowrap">
                        {section.name}
                      </span>
                      {/* Tooltip Arrow */}
                      <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-gray-900 dark:border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent" />
                    </div>
                  </motion.div>

                  {/* Navigation Dot */}
                  <motion.button
                    onClick={() => scrollToSection(index)}
                    className="relative flex items-center justify-center"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {/* Connecting Line */}
                    {index < sections.length - 1 && (
                      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-px h-6 bg-gray-300 dark:bg-gray-600" />
                    )}
                    
                    {/* Dot */}
                    <motion.div
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                        index === currentSection
                          ? 'bg-[var(--brand-primary-solid)] border-[var(--brand-primary-solid)] shadow-lg'
                          : 'bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-500 hover:border-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid)]/20'
                      }`}
                      animate={{
                        scale: index === currentSection ? 1.2 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    />
                    
                    {/* Active indicator - outer ring */}
                    {index === currentSection && (
                      <motion.div
                        className="absolute w-6 h-6 rounded-full border border-[var(--brand-primary-solid)]/40"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.4, 0.1, 0.4]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    )}
                  </motion.button>
                </div>
              ))}
            </div>

            {/* Progress Indicator */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {currentSection + 1} / {sections.length}
                </span>
                <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--brand-primary-solid)] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${((currentSection + 1) / sections.length) * 100}%` 
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
