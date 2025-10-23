// frontend/components/landing/SocialProof.tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { ChevronLeft, ChevronRight, Users, Briefcase, Target } from 'lucide-react';
import { VideoModal } from '@/components/ui/VideoModal';
import Image from 'next/image';

export function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-100px" });
  const [currentCard, setCurrentCard] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState('');

  const avatarCards = [
    {
      id: 'default',
      title: 'Our Vision',
      icon: Target,
      videoId: 'Vzg3Ltsmmw4',
      isShort: false,
      content: {
        text: [
          "At Repruv, we believe creators deserve more than just tools — they deserve a strategic partner for sustainable growth. Our philosophy goes beyond automation; we're building the infrastructure for creator economy success through intelligent engagement, audience insights, and monetization optimization.",
          "We empower creators to transform their passion into profitable businesses by automating meaningful interactions, identifying growth opportunities, and maximizing revenue streams across TikTok, YouTube, and Instagram. Your creativity drives content, our AI drives your business growth."
        ],
        quote: "Where authentic engagement meets strategic growth and enhanced monetization.",
        attribution: "— The Repruv Vision"
      }
    },
    {
      id: 'creators',
      title: 'For Creators',
      icon: Users,
      videoId: 'f8qaKONsEbU',
      isShort: true,
      content: {
        bullets: [
          "Reclaim 15+ hours weekly by automating comment & DM responses with your authentic voice.",
          "Turn engagement into revenue with AI-powered audience insights and monetization opportunities.",
          "Protect and enhance your brand reputation with intelligent response management across all platforms.",
          "Build 3x stronger community connections through consistent, personalized interactions.",
          "Scale your creator business with unified TikTok, YouTube, Instagram management from one dashboard."
        ],
        quote: "Transform your passion into profit while maintaining authentic connections.",
        attribution: "— Your Creator Success Partner"
      }
    },
    {
      id: 'agencies',
      title: 'For Agencies',
      icon: Briefcase,
      content: {
        bullets: [
          "Maximize creator portfolio ROI with unified management across all platforms and talent.",
          "Drive measurable revenue growth for each creator using AI-powered engagement optimization.",
          "Deliver comprehensive performance analytics showing engagement, growth, and monetization metrics.",
          "Scale operations efficiently while reducing management overhead by 70% across your roster.",
          "Enhance creator retention and satisfaction with personalized, authentic audience interactions."
        ],
        quote: "Transform creator management into profitable portfolio growth.",
        attribution: "— Your Strategic Growth Partner"
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

  // Manage YouTube thumbnail fallback sequence per current avatar
  // Initialize thumbnail synchronously to prevent initial placeholder when a video exists
  const [thumbSrc, setThumbSrc] = useState<string>(() =>
    currentAvatar.videoId ? `https://i.ytimg.com/vi/${currentAvatar.videoId}/maxresdefault.jpg` : ''
  );
  useEffect(() => {
    if (currentAvatar.videoId) {
      setThumbSrc(`https://i.ytimg.com/vi/${currentAvatar.videoId}/maxresdefault.jpg`);
    } else {
      setThumbSrc('');
    }
  }, [currentAvatar.videoId]);

  return (
    // Reduced padding on mobile for better spacing
    <motion.section 
      id="vision" 
      className="py-16 md:py-24 section-background"
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
                className="text-3xl md:text-4xl lg:text-5xl font-bold brand-text font-['Poppins',sans-serif]"
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
                type="button"
                aria-label={`Go to ${avatarCards[index].title}`}
                className={`w-3 h-3 p-2 rounded-full transition-all duration-300 ${ // p-2 increases touch target to >= 44px with icon size
                  currentCard === index 
                    ? 'bg-[var(--brand-primary)] scale-125' 
                    : 'bg-muted hover:bg-muted-foreground/30'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
        </motion.div>

        {/* Main Content Card */}
        <div ref={ref} className="relative overflow-hidden"> {/* Prevent horizontal overflow on small screens */}
          {/* Navigation Arrows */}
          <motion.button
            onClick={prevCard}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-3 bg-card rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-border"
            aria-label="Previous"
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
          >
            <ChevronLeft className="w-6 h-6 text-primary-dark" />
          </motion.button>

          <motion.button
            onClick={nextCard}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-3 bg-card rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-border"
            aria-label="Next"
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
          >
            <ChevronRight className="w-6 h-6 text-primary-dark" />
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
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center glass-panel rounded-2xl p-4 md:p-6 lg:p-8 shadow-xl"
            >
              
              {/* Video Section - Left Side */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex justify-center lg:justify-start"
              >
                <motion.div 
                  className="relative w-full max-w-md bg-gradient-to-br from-[var(--muted)] to-[var(--secondary)] dark:from-[var(--secondary)] dark:to-[var(--muted)] rounded-xl shadow-lg flex items-center justify-center overflow-hidden"
                  style={{
                    // Use consistent 16:9 aspect ratio for the container to maintain layout
                    aspectRatio: '16/9',
                  }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Video Thumbnail with Play Button */}
                  <motion.div 
                    className="w-full h-full cursor-pointer"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    onClick={() => {
                      if (currentAvatar.videoId) {
                        setCurrentVideoId(currentAvatar.videoId);
                        setVideoModalOpen(true);
                      }
                    }}
                  >
                    {/* Enhanced YouTube Thumbnail with better loading states and play button */}
                    <div className="relative w-full h-full">
                      {currentAvatar.videoId ? (
                        thumbSrc ? (
                          <Image
                            src={thumbSrc}
                            alt={`${currentAvatar.title} video thumbnail`}
                            fill
                            unoptimized
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className={`rounded-xl object-cover`}
                            onError={() => {
                              // Progressively downgrade thumbnail quality
                              if (thumbSrc.includes('maxresdefault')) {
                                setThumbSrc(`https://i.ytimg.com/vi/${currentAvatar.videoId}/sddefault.jpg`);
                              } else if (thumbSrc.includes('sddefault')) {
                                setThumbSrc(`https://i.ytimg.com/vi/${currentAvatar.videoId}/hqdefault.jpg`);
                              } else if (thumbSrc.includes('hqdefault')) {
                                setThumbSrc(`https://i.ytimg.com/vi/${currentAvatar.videoId}/mqdefault.jpg`);
                              } else if (thumbSrc.includes('mqdefault')) {
                                setThumbSrc(`https://i.ytimg.com/vi/${currentAvatar.videoId}/default.jpg`);
                              }
                            }}
                            priority
                          />
                        ) : (
                          // Skeleton loader while the thumbSrc resolves
                          <div className="w-full h-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 animate-pulse" />
                        )
                      ) : (
                        // Only show explicit message when no video is provided for this card
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/70 rounded-xl">
                          <svg className="w-12 h-12 text-muted-foreground mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm text-secondary-dark font-medium">Video coming soon</p>
                        </div>
                      )}

                      {/* Play Button Overlay */}
                      {currentAvatar.videoId && (
                        <button
                          type="button"
                          aria-label={`Play ${currentAvatar.title} video`}
                          className="absolute inset-0 flex items-center justify-center"
                          onClick={() => {
                            setCurrentVideoId(currentAvatar.videoId);
                            setVideoModalOpen(true);
                          }}
                        >
                          <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/30 shadow-lg">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </button>
                      )}
                    </div>
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
              type="button"
              className={`p-4 rounded-xl transition-all duration-300 border-2 ${
                currentCard === index
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 shadow-lg'
                  : 'border-muted hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/5'
              }`}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <card.icon className={`w-6 h-6 ${
                currentCard === index 
                  ? 'text-[var(--brand-primary)]' 
                  : 'text-muted-foreground'
              }`} />
              <p className={`text-sm mt-2 font-medium font-['Poppins',sans-serif] ${
                currentCard === index 
                  ? 'text-[var(--brand-primary)]' 
                  : 'text-secondary-dark'
              }`}>
                {card.title}
              </p>
            </motion.button>
          ))}
        </motion.div>
      </div>
      
      {/* Video Modal for YouTube Videos */}
      <VideoModal 
        videoId={currentVideoId}
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        isShort={!!avatarCards.find(c => c.videoId === currentVideoId)?.isShort}
      />
    </motion.section>
  );
}