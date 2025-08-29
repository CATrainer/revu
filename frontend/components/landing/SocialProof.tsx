// frontend/components/landing/SocialProof.tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { ChevronLeft, ChevronRight, Users, Briefcase, Target } from 'lucide-react';

export function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-100px" });
  const [currentCard, setCurrentCard] = useState(0);

  const avatarCards = [
    {
      id: 'default',
      title: 'Our Vision',
      icon: Target,
      content: {
        text: [
          "At Repruv, we believe every creator deserves authentic engagement without the time drain. In today's digital world, comments and messages shape your community — managing them shouldn't consume your creativity.",
          "Repruv empowers creators to automate responses to comments and direct messages across TikTok, YouTube, and Instagram, using AI that sounds like you. Transform engagement into growth while staying true to your voice."
        ],
        quote: "Your responses, automated intelligently. Your voice, amplified authentically.",
        attribution: "— The Repruv Team"
      }
    },
    {
      id: 'creators',
      title: 'For Creators',
      icon: Users,
      content: {
        bullets: [
          "Save 10+ hrs/week responding to comments & DMs with AI.",
          "Protect your personal brand reputation across all platforms.",
          "Spot negative feedback instantly with real-time alerts.",
          "Build stronger engagement = up to 3x more loyal followers.",
          "One dashboard to handle YouTube, TikTok, Instagram responses & more."
        ],
        quote: "Grow your audience authentically while staying true to your voice.",
        attribution: "— Built for Creators"
      }
    },
    {
      id: 'agencies',
      title: 'For Agencies',
      icon: Briefcase,
      content: {
        bullets: [
          "Manage multiple creator accounts from one central hub.",
          "Scale creator engagement with AI that matches each creator's voice.",
          "Monitor all your creators' mentions and comments in real-time.",
          "Deliver growth reports showing engagement metrics & follower gains.",
          "Reduce response management workload by 60% across your roster."
        ],
        quote: "Scale creator management with intelligent automation.",
        attribution: "— Agency Partners"
      }
    }
  ];

  const nextCard = () => {
    setCurrentCard((prev) => (prev + 1) % avatarCards.length);
  };

  const prevCard = () => {
    setCurrentCard((prev) => (prev - 1 + avatarCards.length) % avatarCards.length);
  };

  const currentAvatar = avatarCards[currentCard];

  return (
    <motion.section 
      id="vision" 
      className="py-24 section-background-alt"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Title with Avatar Indicator */}
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.8 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <motion.div
              key={currentAvatar.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="p-3 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white"
            >
              <currentAvatar.icon className="w-6 h-6" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.h2 
                key={currentAvatar.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-2xl md:text-3xl font-bold brand-text font-['Poppins',sans-serif]"
              >
                {currentAvatar.title}
              </motion.h2>
            </AnimatePresence>
          </div>

          {/* Avatar Navigation Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {avatarCards.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => setCurrentCard(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentCard === index 
                    ? 'bg-[var(--brand-primary)] scale-125' 
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
        </motion.div>

        {/* Main Content Card */}
        <div ref={ref} className="relative">
          {/* Navigation Arrows */}
          <motion.button
            onClick={prevCard}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </motion.button>

          <motion.button
            onClick={nextCard}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
          >
            <ChevronRight className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </motion.button>

          {/* Card Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -300, scale: 0.8 }}
              transition={{ 
                duration: 0.6, 
                ease: [0.25, 0.46, 0.45, 0.94] 
              }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-100 dark:border-gray-700"
            >
              
              {/* Video Section - Left Side */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex justify-center lg:justify-start"
              >
                <motion.div 
                  className="relative w-full max-w-md aspect-video bg-gradient-to-br from-[var(--muted)] to-[var(--secondary)] dark:from-[var(--secondary)] dark:to-[var(--muted)] rounded-xl shadow-lg flex items-center justify-center overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Video Placeholder */}
                  <motion.div 
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                  >
                    <motion.div 
                      className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] rounded-full flex items-center justify-center shadow-md"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                      </svg>
                    </motion.div>
                    <motion.p 
                      className="text-sm text-gray-600 dark:text-gray-300 font-medium font-['Poppins',sans-serif]"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                    >
                      {currentAvatar.title} Video
                    </motion.p>
                    <motion.p 
                      className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-['Poppins',sans-serif]"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.8 }}
                    >
                      Coming Soon
                    </motion.p>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Content Section - Right Side */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="lg:pl-8"
              >
                <div className="text-base text-primary-dark leading-relaxed space-y-4 font-['Poppins',sans-serif]">
                  {currentAvatar.content.text ? (
                    // Default card with paragraphs
                    currentAvatar.content.text.map((paragraph, index) => (
                      <motion.p
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 + (index * 0.1) }}
                      >
                        {paragraph}
                      </motion.p>
                    ))
                  ) : (
                    // Avatar cards with bullet points
                    <motion.ul
                      className="space-y-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      {currentAvatar.content.bullets?.map((bullet, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.5 + (index * 0.1) }}
                          className="flex items-start gap-3"
                        >
                          <motion.div
                            className="w-2 h-2 bg-[var(--brand-primary)] rounded-full mt-2 flex-shrink-0"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.6 + (index * 0.1) }}
                          />
                          <span className="text-sm leading-relaxed">{bullet}</span>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-r from-[var(--muted)] to-[var(--secondary)] dark:from-[var(--secondary)] dark:to-[var(--muted)] p-4 rounded-lg border-l-4 border-[var(--brand-primary)]"
                  >
                    <motion.p 
                      className="text-base font-semibold text-primary-dark mb-2 font-['Poppins',sans-serif]"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.8 }}
                    >
                      &ldquo;{currentAvatar.content.quote}&rdquo;
                    </motion.p>
                    <motion.p 
                      className="text-xs text-primary-dark italic font-['Poppins',sans-serif]"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 1 }}
                    >
                      {currentAvatar.content.attribution}
                    </motion.p>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Card Preview Indicators */}
        <motion.div 
          className="flex justify-center gap-4 mt-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          {avatarCards.map((card, index) => (
            <motion.button
              key={card.id}
              onClick={() => setCurrentCard(index)}
              className={`p-4 rounded-xl transition-all duration-300 border-2 ${
                currentCard === index
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/5'
              }`}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <card.icon className={`w-6 h-6 ${
                currentCard === index 
                  ? 'text-[var(--brand-primary)]' 
                  : 'text-gray-400 dark:text-gray-500'
              }`} />
              <p className={`text-sm mt-2 font-medium font-['Poppins',sans-serif] ${
                currentCard === index 
                  ? 'text-[var(--brand-primary)]' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {card.title}
              </p>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}