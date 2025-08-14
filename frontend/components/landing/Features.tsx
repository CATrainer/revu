'use client';

import React from 'react';
import Link from 'next/link';
import { motion, LazyMotion, domAnimation, useInView } from "framer-motion";
import { 
  FaStar,
  FaBrain,         // Changed from FaRobot to FaBrain for AI
  FaBinoculars,
  FaHashtag,
  FaChartBar,
  FaUsers
} from "react-icons/fa";
import { IconType } from "react-icons";

interface Feature {
  icon: IconType;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: FaStar,
    title: 'Review Management',
    description: 'Centralize all reviews from Google, TrustPilot, Social Media platforms and more into one intelligent inbox.',
  },
  {
    icon: FaBrain,
    title: 'AI Responses',
    description: 'Generate personalized responses in your brand voice using AI.',
  },
  {
    icon: FaBinoculars,
    title: 'Competitor Tracking',
    description: 'Monitor and benchmark against local competitors to stay ahead of the competition.',
  },
  {
    icon: FaHashtag,
    title: 'Social Monitoring',
    description: 'Track mentions and feedback across social media platforms.',
  },
  {
    icon: FaChartBar,
    title: 'Analytics & Reports',
    description: 'Get actionable insights with comprehensive reporting and analytics derived from your review data.',
  },
  {
    icon: FaUsers,
    title: 'Team Collaboration',
    description: 'Work collaboratively with task assignments, role-based permissions and automation workflows.',
  },
];

export function Features() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });

  return (
    <LazyMotion features={domAnimation}>
  <section ref={ref} className="theme-home-features py-24 section-background-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-4">
              Everything You Need to Manage Your Online Reputation
            </h2>
            <p className="text-lg text-secondary-dark max-w-2xl mx-auto">
              Powerful features designed to save you time and grow your business
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ delay: index * 0.15, duration: 0.6 }}
                className="card-background p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <Link href={`/features#${feature.title.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`} className="block">
                  <div className="flex items-center justify-center mb-6">
                    <feature.icon 
                      className={`text-[var(--feature-icon)] transition-transform hover:scale-110`} 
                      size={48} 
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-primary-dark mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-secondary-dark">{feature.description}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </LazyMotion>
  );
}