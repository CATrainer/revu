'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaBrain, FaMagic, FaChartLine } from 'react-icons/fa';
import { motion, useInView, LazyMotion, domAnimation } from 'framer-motion';

export default function AIPage() {
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: false, amount: 0.3 });

  return (
    <LazyMotion features={domAnimation}>
      <div className="py-12 section-background">
        {/* Repruv AI Content */}
        <AIContent />

        {/* CTA Section */}
        <CTASection />
      </div>
    </LazyMotion>
  );
}

function AIContent() {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const advancedRef = useRef(null);
  const statsRef = useRef(null);
  
  const isHeroInView = useInView(heroRef, { once: false, amount: 0.3 });
  const isFeaturesInView = useInView(featuresRef, { once: false, amount: 0.2 });
  const isAdvancedInView = useInView(advancedRef, { once: false, amount: 0.2 });
  const isStatsInView = useInView(statsRef, { once: false, amount: 0.3 });

  return (
    <>
      {/* Repruv AI Hero Section */}
      <motion.section 
        ref={heroRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        initial={{ opacity: 0 }}
        animate={isHeroInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div 
          className="inline-flex items-center gap-2 brand-background text-[var(--brand-primary)] px-4 py-2 rounded-full text-sm font-medium mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <FaMagic className="h-4 w-4" />
          Powered by Advanced AI
        </motion.div>
        <motion.h1 
          className="text-4xl md:text-5xl font-bold text-primary-dark mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Repruv AI Enhances Your Community Engagement
        </motion.h1>
        <motion.p 
          className="text-xl text-secondary-dark mb-8 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          Generate personalized responses that maintain your unique voice while saving 80% of response time
        </motion.p>
        <motion.div 
          className="flex justify-center gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Button size="lg" className="button-primary" asChild>
            <Link href="/join-waitlist">Try AI Response Generator</Link>
          </Button>
          <Button size="lg" variant="secondary" className="button-secondary" asChild>
            <Link href="/#hero">Get Early Access</Link>
          </Button>
        </motion.div>
      </motion.section>

      {/* How It Works */}
      <motion.section 
        ref={featuresRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24"
        initial={{ opacity: 0 }}
        animate={isFeaturesInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h2 
          className="text-3xl font-bold text-primary-dark mb-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isFeaturesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          How Our AI Works
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: FaBrain,
              title: "1. Learn Your Voice",
              description: "Our AI analyzes your past responses and brand guidelines to understand your unique communication style."
            },
            {
              icon: FaMagic,
              title: "2. Generate Responses",
              description: "Creates contextual, personalized responses for each review that sound authentically like you."
            },
            {
              icon: FaChartLine,
              title: "3. Improve Over Time",
              description: "Every edit you make helps the AI better understand your preferences and improve future responses."
            }
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={isFeaturesInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.9 }}
              transition={{ 
                delay: 0.4 + (index * 0.2), 
                duration: 0.7,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              whileHover={{ 
                scale: 1.05,
                y: -5,
                transition: { duration: 0.2 }
              }}
            >
              <Card>
                <CardHeader>
                  <motion.div 
                    className="flex items-center justify-center mb-4"
                    whileHover={{ rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <item.icon className="h-12 w-12 brand-text" />
                  </motion.div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-secondary-dark">{item.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* AI Features */}
      <motion.section 
        ref={advancedRef}
        className="section-background-alt py-24 mt-24"
        initial={{ opacity: 0 }}
        animate={isAdvancedInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            className="text-3xl font-bold text-primary-dark mb-12 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={isAdvancedInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Advanced AI Features
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isAdvancedInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <h3 className="text-2xl font-semibold mb-6 text-primary-dark">Smart Response Generation</h3>
              <ul className="space-y-4">
                {[
                  { title: "Context-Aware", desc: "Understands review sentiment and responds appropriately" },
                  { title: "Brand Consistent", desc: "Maintains your tone whether professional, friendly, or casual" },
                  { title: "Personalized", desc: "References specific details mentioned in reviews" },
                  { title: "Multi-language", desc: "Coming soon: respond in the reviewer's language" }
                ].map((item, index) => (
                  <motion.li 
                    key={index}
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={isAdvancedInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    transition={{ duration: 0.6, delay: 0.6 + (index * 0.1) }}
                  >
                    <span className="text-[var(--foreground)]/70 dark:text-[var(--brand-primary)] mr-3">✓</span>
                    <div className="text-body-dark">
                      <strong>{item.title}</strong> - {item.desc}
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isAdvancedInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <h3 className="text-2xl font-semibold mb-6">Natural Language Insights</h3>
              <ul className="space-y-4">
                {[
                  { title: "Ask Anything", desc: "Query your reviews in plain English" },
                  { title: "Trend Detection", desc: "Automatically identifies emerging issues" },
                  { title: "Sentiment Analysis", desc: "Understand customer emotions at scale" },
                  { title: "Actionable Recommendations", desc: "Get specific improvement suggestions" }
                ].map((item, index) => (
                  <motion.li 
                    key={index}
                    className="flex items-start"
                    initial={{ opacity: 0, x: 20 }}
                    animate={isAdvancedInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                    transition={{ duration: 0.6, delay: 0.8 + (index * 0.1) }}
                  >
                    <span className="text-[var(--foreground)]/70 dark:text-[var(--brand-primary)] mr-3">✓</span>
                    <div>
                      <strong>{item.title}</strong> - {item.desc}
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* AI Stats */}
      <motion.section 
        ref={statsRef}
        className="py-24 section-background"
        initial={{ opacity: 0 }}
        animate={isStatsInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { value: "92%", label: "Response Acceptance Rate" },
              { value: "10min", label: "Average Response Time" },
              { value: "4.8/5", label: "Customer Satisfaction" },
              { value: "80%", label: "Time Saved" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={isStatsInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
                transition={{ duration: 0.6, delay: 0.2 + (index * 0.1) }}
                whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
              >
                <div className="text-4xl font-bold status-info mb-2">{stat.value}</div>
                <p className="text-secondary-dark">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
    </>
  );
}



function CTASection() {
  const ctaRef = useRef(null);
  const isCtaInView = useInView(ctaRef, { once: false, amount: 0.5 });

  return (
    <motion.section 
      ref={ctaRef}
      className="py-16 section-background-alt"
      initial={{ opacity: 0 }}
      animate={isCtaInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <motion.h2 
          className="text-3xl font-bold text-primary-dark mb-4"
          initial={{ opacity: 0, y: 30 }}
          animate={isCtaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Experience the Future of Review Management
        </motion.h2>
        <motion.p 
          className="text-xl text-secondary-dark mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isCtaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Let AI handle the heavy lifting while you focus on your business
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isCtaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button size="lg" className="button-primary" asChild>
            <Link href="/#hero">Get Early Access</Link>
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
}
