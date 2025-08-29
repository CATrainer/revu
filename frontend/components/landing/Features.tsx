'use client';

import React from 'react';
import Link from 'next/link';
import { motion, LazyMotion, domAnimation, useInView } from "framer-motion";
import { 
  FaReply,         // Reply icon for response automation
  FaBrain,         // AI brain for intelligent responses
  FaHashtag,       // Social media hashtag
  FaChartBar,      // Analytics charts
  FaInstagram,     // Instagram icon
  FaFacebook,      // Facebook icon
  FaTwitter,       // Twitter icon
  FaYoutube,       // YouTube icon
  FaLinkedin,      // LinkedIn icon
  FaTiktok         // TikTok icon
} from "react-icons/fa";
import { IconType } from "react-icons";

interface Feature {
  icon: IconType;
  title: string;
  description: string;
  iconColor: string;
}

const features: Feature[] = [
  {
    icon: FaReply,
    iconColor: 'text-blue-500', // Blue for replies/communication
    title: 'Response Automation',
    description: 'Automate replies to comments on your reels/videos and direct messages centrally on TikTok, YouTube and Instagram.',
  },
  {
    icon: FaBrain,
    iconColor: 'text-purple-500', // Purple for AI intelligence
    title: 'AI Responses',
    description: 'Generate personalized responses in your tone and voice using Repruv AI.',
  },
  {
    icon: FaHashtag,
    iconColor: 'text-pink-500', // Pink for social media
    title: 'Social Monitoring',
    description: 'Track text sentiment, @ mentions and hashtags and keep ontop of what people are saying about you on social media.',
  },
  {
    icon: FaChartBar,
    iconColor: 'text-green-500', // Green for growth/analytics
    title: 'Analytics & Reports',
    description: 'Get actionable insights with comprehensive reporting and analytics derived from your chat and response data.',
  },
];

export function Features() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });

  return (
    <LazyMotion features={domAnimation}>
      <motion.section 
        id="features" 
        ref={ref} 
        className="py-24 section-background-alt"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.h2 
              className="text-3xl md:text-4xl lg:text-5xl font-bold brand-text mb-4 font-['Poppins',sans-serif]"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Everything You Need to Manage Your Community Engagement
            </motion.h2>
            <motion.p 
              className="text-lg md:text-xl text-primary-dark max-w-2xl mx-auto font-['Poppins',sans-serif] font-bold"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Powerful features designed to save you time and grow your audience&nbsp;⚡.
            </motion.p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.9 }}
                transition={{ 
                  delay: 0.6 + (index * 0.1), 
                  duration: 0.7,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{ 
                  scale: 1.05,
                  y: -5,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ 
                  scale: 0.98,
                  transition: { duration: 0.1 }
                }}
                className="card-background p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
              >
                {/* Social Media Background Icons for Response Automation */}
                {feature.title === 'Response Automation' && (
                  <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <FaInstagram className="absolute top-4 right-4 text-pink-500" size={24} />
                    <FaFacebook className="absolute top-16 right-12 text-blue-600" size={20} />
                    <FaTwitter className="absolute top-8 right-24 text-blue-400" size={18} />
                    <FaYoutube className="absolute bottom-16 right-8 text-red-500" size={22} />
                    <FaLinkedin className="absolute bottom-8 right-20 text-blue-700" size={16} />
                    <FaTiktok className="absolute bottom-4 right-32 text-black" size={20} />
                    <FaInstagram className="absolute bottom-12 left-8 text-pink-500" size={18} />
                    <FaFacebook className="absolute top-12 left-4 text-blue-600" size={24} />
                    <FaTwitter className="absolute bottom-20 left-16 text-blue-400" size={16} />
                    <FaYoutube className="absolute top-20 left-12 text-red-500" size={20} />
                  </div>
                )}
                
                <Link href={`/features#${feature.title.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`} className="block relative z-10">
                  <motion.div 
                    className="flex items-center justify-center mb-6"
                    whileHover={{ rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <feature.icon 
                      className={`${feature.iconColor} transition-transform group-hover:scale-110`} 
                      size={48} 
                    />
                  </motion.div>
                  <motion.h3 
                    className="text-xl font-semibold text-primary-dark mb-2 font-['Poppins',sans-serif] text-center"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: 0.8 + (index * 0.1), duration: 0.5 }}
                  >
                    {feature.title}
                  </motion.h3>
                  <motion.p 
                    className="text-secondary-dark font-['Poppins',sans-serif]"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: 1.0 + (index * 0.1), duration: 0.5 }}
                  >
                    {feature.description}
                  </motion.p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </LazyMotion>
  );
}