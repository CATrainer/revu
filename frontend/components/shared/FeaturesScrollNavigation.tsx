// frontend/components/shared/FeaturesScrollNavigation.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

interface Section {
  id: string;
  name: string;
}

// Dynamically set sections based on the current page
const allSections = {
  features: [
    { id: 'hero', name: 'Overview' },
    { id: 'comment-automation', name: 'DM & Comment Automation' },
    { id: 'social-monitoring', name: 'Social Monitoring' },
    { id: 'ai-responses', name: 'AI Creator Sidekick' },
    { id: 'analytics-and-reports', name: 'Analytics & Reports' },
    { id: 'upcoming-features', name: 'Upcoming Features' }
  ],
  landing: [
    { id: 'hero', name: 'Home' },
    { id: 'features', name: 'Features' },
    { id: 'vision', name: 'Vision' }
  ]
};

// Default to features page sections
const sections: Section[] = [...allSections.features];

export function FeaturesScrollNavigation() {
  const [currentSection, setCurrentSection] = useState(0);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [activeSections, setActiveSections] = useState<Section[]>(sections);
  const [pageType, setPageType] = useState<'features' | 'landing'>('features');

  useEffect(() => {
    // Detect the current page based on the URL
    const path = window.location.pathname;
    const isFeaturePage = path.includes('features');
    const currentPageType = isFeaturePage ? 'features' : 'landing';
    setPageType(currentPageType);
    setActiveSections(allSections[currentPageType]);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2;
      
      // Find current section based on scroll position with better centering logic
      for (let i = activeSections.length - 1; i >= 0; i--) {
        const element = document.getElementById(activeSections[i].id);
        if (element) {
          const elementTop = element.offsetTop;
          const elementCenter = elementTop + element.offsetHeight / 2;
          
          // Use element center for better section detection
          if (scrollPosition >= elementCenter - window.innerHeight / 4) {
            setCurrentSection(i);
            break;
          }
        }
      }

      // Check if we're at the end (last section)
      setIsAtEnd(currentSection >= activeSections.length - 1);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentSection, activeSections]);

  // Removed unused handleNavigation function

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50"
    >
      {/* Container with background for vertical alignment */}
      <div className="relative flex flex-col items-center bg-white/80 backdrop-blur-sm py-4 px-2 rounded-full shadow-lg">
        {/* Section indicators - now vertical */}
        <motion.div 
          className="flex flex-col justify-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {activeSections.map((section, index) => (
            <motion.div
              key={index}
              className="relative group"
              whileHover={{ scale: 1.2 }}
              onClick={() => {
                const sectionElement = document.getElementById(section.id);
                if (sectionElement) {
                  sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {/* The dot indicator */}
              <div 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSection 
                    ? 'bg-green-500 scale-110' 
                    : index < currentSection 
                      ? 'bg-green-500 opacity-60' 
                      : 'bg-gray-300'
                }`}
              />
              
              {/* Tooltip with section name */}
              <div className="absolute right-6 top-1/2 transform -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-xs bg-white px-2 py-1 rounded-md shadow-md text-green-600 font-medium">
                  {section.name}
                </span>
              </div>
              
              {/* Active indicator */}
              {index === currentSection && (
                <motion.div 
                  className="absolute inset-0 border-2 border-green-500 rounded-full"
                  layoutId="activeSection"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Back to top button at bottom */}
        <AnimatePresence>
          {isAtEnd && (
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => {
                const heroSection = document.getElementById('hero');
                if (heroSection) {
                  heroSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="mt-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronUp className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
