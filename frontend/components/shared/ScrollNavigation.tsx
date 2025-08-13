// frontend/components/shared/ScrollNavigation.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Section {
  id: string;
  name: string;
}

const sections: Section[] = [
  { id: 'hero', name: 'Home' },
  { id: 'features', name: 'Everything You Need to Manage Your Online Reputation' },
  { id: 'vision', name: 'Our Vision' },
  { id: 'pricing', name: 'Intuitive Pricing' },
  { id: 'early-access-form', name: 'Ready to Transform Your Review Management?' }
];

export function ScrollNavigation() {
  const [currentSection, setCurrentSection] = useState(0);
  const [isAtEnd, setIsAtEnd] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2;
      
      // Find current section based on scroll position
      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          setCurrentSection(i);
          break;
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
          block: 'start'
        });
      }
    } else {
      // Go to next section
      const nextSectionIndex = Math.min(currentSection + 1, sections.length - 1);
      const nextSection = document.getElementById(sections[nextSectionIndex].id);
      
      if (nextSection) {
        nextSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  const getButtonText = () => {
    if (isAtEnd) {
      return 'Back to Top';
    }
    const nextIndex = Math.min(currentSection + 1, sections.length - 1);
    return sections[nextIndex].name;
  };

  const getShortButtonText = () => {
    if (isAtEnd) {
      return 'Back to Top';
    }
    const nextIndex = Math.min(currentSection + 1, sections.length - 1);
    const name = sections[nextIndex].name;
    // Shorten long section names for mobile
    if (name.length > 30) {
      return name.split(' ').slice(0, 3).join(' ') + '...';
    }
    return name;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
    >
      <motion.button
        onClick={handleNavigation}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-white rounded-full px-6 py-4 shadow-lg hover:shadow-xl transition-all duration-200 group flex items-center space-x-3 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg"
        aria-label={getButtonText()}
      >
        {/* Arrow Icon */}
        <motion.div
          animate={{ 
            y: isAtEnd ? 0 : [0, 4, 0],
            rotate: isAtEnd ? 180 : 0
          }}
          transition={{ 
            y: { duration: 1.5, repeat: isAtEnd ? 0 : Infinity, ease: "easeInOut" },
            rotate: { duration: 0.3 }
          }}
          className="flex-shrink-0"
        >
          {isAtEnd ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </motion.div>
        
        {/* Text */}
        <motion.span 
          key={isAtEnd ? 'top' : currentSection}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="font-medium text-sm truncate"
        >
          <span className="hidden sm:inline">{getButtonText()}</span>
          <span className="sm:hidden">{getShortButtonText()}</span>
        </motion.span>

        {/* Progress indicator */}
        <div className="flex-shrink-0 w-8 h-8 relative">
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
            <span className="text-xs font-bold text-white">
              {isAtEnd ? '↑' : `${currentSection + 1}`}
            </span>
          </div>
        </div>
      </motion.button>

      {/* Section indicators */}
      <motion.div 
        className="flex justify-center mt-3 space-x-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {sections.map((_, index) => (
          <motion.div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index <= currentSection 
                ? 'bg-[var(--brand-primary-solid)]' 
                : 'bg-[var(--brand-primary-solid)] opacity-30'
            }`}
            whileHover={{ scale: 1.2 }}
            onClick={() => {
              const section = document.getElementById(sections[index].id);
              if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
