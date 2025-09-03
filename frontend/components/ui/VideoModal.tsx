'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface VideoModalProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  isShort?: boolean;
}

export function VideoModal({ videoId, isOpen, onClose, isShort = false }: VideoModalProps) {
  const [videoDimensions, setVideoDimensions] = useState({ width: 480, height: 853 });
  const [containerWidth, setContainerWidth] = useState('auto');

  // Adjust size to exactly match the YouTube video dimensions
  useEffect(() => {
    // Calculate dimensions based on window size and video type
    const calculateDimensions = () => {
      // Safely handle window access for NextJS SSR
      if (typeof window === 'undefined') return;
      
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      if (isShort) {
        // For YouTube Shorts (9:16 aspect ratio) - exact dimensions of YouTube Shorts
        const exactWidth = 460; // Standard YouTube Shorts width
        const exactHeight = 816; // Standard YouTube Shorts height
        
        // Scale down if needed for smaller screens
        let scaleFactor = 1;
        if (exactHeight > windowHeight * 0.9) {
          scaleFactor = (windowHeight * 0.9) / exactHeight;
        }
        if (exactWidth * scaleFactor > windowWidth * 0.9) {
          scaleFactor = Math.min(scaleFactor, (windowWidth * 0.9) / exactWidth);
        }
        
        // Set exact dimensions scaled for screen size
        setVideoDimensions({
          width: Math.round(exactWidth * scaleFactor), 
          height: Math.round(exactHeight * scaleFactor)
        });
        
        // Set container width to match the video exactly
        setContainerWidth(`${Math.round(exactWidth * scaleFactor)}px`);
      } else {
        // For regular 16:9 videos - exact YouTube dimensions
        const exactWidth = 1280; // Standard YouTube width
        const exactHeight = 720; // Standard YouTube height (16:9 aspect ratio)
        
        // Scale down if needed for smaller screens
        let scaleFactor = 1;
        if (exactWidth > windowWidth * 0.9) {
          scaleFactor = (windowWidth * 0.9) / exactWidth;
        }
        if (exactHeight * scaleFactor > windowHeight * 0.9) {
          scaleFactor = Math.min(scaleFactor, (windowHeight * 0.9) / exactHeight);
        }
        
        // Set exact dimensions scaled for screen size
        setVideoDimensions({
          width: Math.round(exactWidth * scaleFactor),
          height: Math.round(exactHeight * scaleFactor)
        });
        
        // Set container width to match the video exactly
        setContainerWidth(`${Math.round(exactWidth * scaleFactor)}px`);
      }
    };
    
    // Calculate initially
    calculateDimensions();
    
    // Add resize listener for responsive behavior
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, [isShort]);

  // Handle escape key press, prevent body scrolling, and hide navigation elements
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    
    // If modal is open, prevent scrolling and hide the navigation elements
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Target FAQProgressNavigation component specifically
      const faqNavigation = document.querySelector('.fixed.right-6.top-1\\/2.-translate-y-1\\/2');
      if (faqNavigation instanceof HTMLElement) {
        faqNavigation.classList.add('hide-navigation-indicators');
      }
      
      // Also hide all fixed elements on the right side that match navigation pattern
      // This targets the navigation dots in the pricing page
      const fixedElements = document.querySelectorAll('.fixed.right-6, .fixed.right-8');
      fixedElements.forEach(el => {
        // Only hide elements that appear to be navigation indicators (contain transform classes)
        if (el instanceof HTMLElement && 
            (el.classList.contains('transform') || 
             el.innerHTML.includes('translate') || 
             el.querySelector('.transform'))) {
          el.classList.add('hide-navigation-indicators');
        }
      });
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
      
      // Restore FAQProgressNavigation component
      const faqNavigation = document.querySelector('.fixed.right-6.top-1\\/2.-translate-y-1\\/2');
      if (faqNavigation instanceof HTMLElement) {
        faqNavigation.classList.remove('hide-navigation-indicators');
      }
      
      // Restore all fixed elements on the right side
      const fixedElements = document.querySelectorAll('.fixed.right-6, .fixed.right-8');
      fixedElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.classList.remove('hide-navigation-indicators');
        }
      });
    };
  }, [isOpen, onClose]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black bg-opacity-90 z-[99999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Enhanced close button with gradient background for better visibility */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.1 }}
            className="absolute top-4 right-4 p-4 z-50 bg-gradient-to-r from-white/90 to-white/70 backdrop-blur rounded-full hover:bg-white transition-all shadow-lg hover:shadow-xl border-2 border-white/50"
            style={{ filter: 'drop-shadow(0px 0px 8px rgba(0,0,0,0.5))' }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-6 h-6 text-black" strokeWidth={2.5} />
          </motion.button>
          
          {/* Exact-sized video container matching YouTube dimensions */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            style={{
              width: containerWidth,
              maxWidth: '100%',
              height: videoDimensions.height
            }}
            className="relative bg-black rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Enhanced iframe with exact dimensions and removed progress indicators */}
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0&modestbranding=1${isShort ? '&loop=1&playsinline=1&controls=1' : ''}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-xl"
              style={{ 
                width: '100%', 
                height: '100%'
              }}
            ></iframe>
            
            {/* Simple loading indicator - appears briefly while video loads */}
            <motion.div 
              className="absolute inset-0 bg-black flex items-center justify-center"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              style={{ pointerEvents: 'none' }}
            >
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
