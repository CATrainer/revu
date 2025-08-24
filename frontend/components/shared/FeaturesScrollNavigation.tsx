// frontend/components/shared/FeaturesScrollNavigation.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

interface Section {
  id: string;
  name: string;
}

const sections: Section[] = [
  { id: 'hero', name: 'Hero' },
  { id: 'review-management', name: 'Review Management' },
  { id: 'ai-responses', name: 'AI-Powered Responses' },
  { id: 'competitor-tracking', name: 'Competitor Tracking' },
  { id: 'social-monitoring', name: 'Social Monitoring' },
  { id: 'analytics-and-reports', name: 'Analytics & Reports' },
  { id: 'team-collaboration', name: 'Team Collaboration' }
];

export function FeaturesScrollNavigation() {
  const [currentSection, setCurrentSection] = useState(0);
  const [isAtEnd, setIsAtEnd] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2;
      
      // Find current section based on scroll position with better centering logic
      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i].id);
        if (element) {
          const elementTop = element.offsetTop;
          const elementBottom = elementTop + element.offsetHeight;
          const elementCenter = elementTop + element.offsetHeight / 2;
          
          // Use element center for better section detection
          if (scrollPosition >= elementCenter - window.innerHeight / 4) {
            setCurrentSection(i);
            break;
          }
        }
      }

      // Check if we're at the end (last section)
      setIsAtEnd(currentSection >= sections.length - 1);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentSection]);

  const handleNavigation = () => {
    if (isAtEnd) {
      // Go back to top
      const heroSection = document.getElementById('hero');
      if (heroSection) {
        heroSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }
    } else {
      // Go to next section
      const nextSectionIndex = Math.min(currentSection + 1, sections.length - 1);
      const nextSection = document.getElementById(sections[nextSectionIndex].id);
      
      if (nextSection) {
        nextSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
    >
      {/* Container for proper alignment */}
      <div className="relative flex flex-col items-center">
        {/* Main navigation button */}
        <motion.button
          onClick={handleNavigation}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 group flex items-center justify-center mb-3"
          aria-label={isAtEnd ? 'Back to Top' : `Section ${currentSection + 1}`}
        >
          {/* Progress indicator with number */}
          <div className="w-8 h-8 relative">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.3"
              />
              <motion.circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="88"
                initial={{ strokeDashoffset: 88 }}
                animate={{ 
                  strokeDashoffset: isAtEnd ? 0 : 88 - (currentSection / (sections.length - 1)) * 88
                }}
                transition={{ duration: 0.5 }}
                className="text-white"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {isAtEnd ? (
                <motion.div
                  animate={{ 
                    y: [0, -2, 0]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                >
                  <ChevronUp className="w-4 h-4 text-white" />
                </motion.div>
              ) : (
                <span className="text-xs font-bold text-white">
                  {currentSection + 1}
                </span>
              )}
            </div>
          </div>
        </motion.button>

        {/* Back to top text for last section */}
        <AnimatePresence>
          {isAtEnd && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
            >
              <span className="text-xs text-[var(--brand-primary-solid)] font-medium bg-white px-2 py-1 rounded shadow-sm">
                Back to Top
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section indicators */}
        <motion.div 
          className="flex justify-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {sections.map((section, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index <= currentSection 
                  ? 'bg-[var(--brand-primary-solid)]' 
                  : 'bg-[var(--brand-primary-solid)] opacity-30'
              }`}
              whileHover={{ scale: 1.2 }}
              onClick={() => {
                const sectionElement = document.getElementById(section.id);
                if (sectionElement) {
                  sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              style={{ cursor: 'pointer' }}
              title={section.name}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
