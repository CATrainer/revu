'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Check, Users, Zap, Lock, Rocket, TrendingUp, MessageCircle } from 'lucide-react';

export function WhyEarlyAccess() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const benefits = [
    {
      icon: Zap,
      title: 'Unlimited Free Access',
      description: 'All features, all platforms (currently available)',
    },
    {
      icon: Lock,
      title: 'Lock In Founder Pricing',
      description: 'Up to 50% off lifetime (optional)',
    },
    {
      icon: MessageCircle,
      title: 'Direct Line to Founders',
      description: 'Your input shapes our roadmap',
    },
    {
      icon: Rocket,
      title: 'First Access',
      description: 'New features, platforms, and integrations',
    },
    {
      icon: TrendingUp,
      title: 'Build Together',
      description: 'Help us create the tools you actually need',
    },
  ];

  return (
    <motion.section 
      id="early-access"
      ref={ref}
      className="py-16 md:py-24 section-background relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-holo-purple/10 to-holo-teal/10 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-primary-dark mb-6">
            Join Our Early Access Program
          </h2>
          <p className="text-xl text-secondary-dark max-w-3xl mx-auto">
            Shape the Future of Creator Monetization
          </p>
        </motion.div>

        {/* For Creators & Agencies */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* For Creators */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-holo-teal" />
              <h3 className="text-2xl font-bold text-primary-dark">For Creators</h3>
            </div>
            <p className="text-secondary-dark mb-4">
              Your feedback directly influences which features we build. Early Access members get priority on feature requests and lifetime preferential pricing.
            </p>
          </motion.div>

          {/* For Agencies */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-holo-mint" />
              <h3 className="text-2xl font-bold text-primary-dark">For Agencies</h3>
            </div>
            <p className="text-secondary-dark mb-4">
              Build the definitive creator management platform WITH us. Get free access for all your creators, influence our agency dashboard development, and lock in exclusive launch pricing.
            </p>
          </motion.div>
        </div>

        {/* Early Access Benefits */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-3xl font-bold text-primary-dark mb-8 text-center">
            Early Access Benefits
          </h3>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className="glass-panel rounded-xl p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              >
                <benefit.icon className="w-12 h-12 text-holo-mint mx-auto mb-4" />
                <h4 className="text-base font-bold text-primary-dark mb-2">{benefit.title}</h4>
                <p className="text-sm text-secondary-dark">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Limited Availability Notice */}
        <motion.div
          className="glass-panel rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <h3 className="text-3xl font-bold text-primary-dark mb-4">
            Limited Availability
          </h3>
          <p className="text-lg text-secondary-dark mb-8 max-w-2xl mx-auto">
            We're onboarding users in controlled waves to ensure quality feedback and personalized support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-holo-mint hover:bg-holo-mint-dark text-gray-900 dark:text-white px-8 py-6 text-lg">
              <Link href="/signup">
                Join Early Access
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-holo-mint text-holo-mint hover:bg-muted px-8 py-6 text-lg">
              <Link href="/agency-partners">
                Learn About Agency Partners →
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
