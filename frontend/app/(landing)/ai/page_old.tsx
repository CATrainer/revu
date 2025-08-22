'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaBrain, FaMagic, FaChartLine } from 'react-icons/fa';
import { Check, TrendingUp, Search, BarChart3 } from 'lucide-react';
import { motion, useInView, LazyMotion, domAnimation } from 'framer-motion';

export default function AIPage() {
  const [activeTab, setActiveTab] = useState<'ai' | 'seo'>('ai');
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: false, amount: 0.3 });

  return (
    <LazyMotion features={domAnimation}>
      <div className="py-12 section-background">
        {/* Toggle Switch Header - Moved higher */}
        <motion.section 
          ref={heroRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isHeroInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <button
              onClick={() => setActiveTab('ai')}
              className={`relative px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === 'ai'
                  ? 'bg-[var(--brand-primary-solid)] text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              AI Response Generator
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`relative px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === 'seo'
                  ? 'bg-[var(--brand-primary-solid)] text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              SEO Optimization
            </button>
          </motion.div>
        </motion.section>

        {/* AI Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: activeTab === 'ai' ? 1 : 0, y: activeTab === 'ai' ? 0 : 20 }}
          transition={{ duration: 0.3 }}
          style={{ display: activeTab === 'ai' ? 'block' : 'none' }}
        >
          <AIContent />
        </motion.div>

        {/* SEO Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: activeTab === 'seo' ? 1 : 0, y: activeTab === 'seo' ? 0 : 20 }}
          transition={{ duration: 0.3 }}
          style={{ display: activeTab === 'seo' ? 'block' : 'none' }}
        >
          <SEOContent />
        </motion.div>

        {/* Shared CTA Section */}
        <CTASection activeTab={activeTab} />
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
      {/* AI Hero Section */}
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
          AI That Speaks Your Brand&apos;s Language
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
            <Link href="/demo">Watch Demo</Link>
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

function SEOContent() {
  const heroRef = useRef(null);
  const whyRef = useRef(null);
  const howRef = useRef(null);
  
  const isHeroInView = useInView(heroRef, { once: false, amount: 0.3 });
  const isWhyInView = useInView(whyRef, { once: false, amount: 0.2 });
  const isHowInView = useInView(howRef, { once: false, amount: 0.2 });

  return (
    <>
      {/* SEO Hero Section */}
      <motion.section 
        ref={heroRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        initial={{ opacity: 0 }}
        animate={isHeroInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1 
          className="text-4xl md:text-5xl font-bold text-primary-dark mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Reviews That Boost Your Local SEO
        </motion.h1>
        <motion.p 
          className="text-xl text-secondary-dark mb-8 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Turn customer feedback into search engine gold with our SEO-optimized review management
        </motion.p>
        <motion.div 
          className="flex justify-center gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Button size="lg" className="button-primary border-0" asChild>
            <Link href="/join-waitlist">Get Early Access</Link>
          </Button>
          <Button size="lg" variant="outline" className="button-secondary" asChild>
            <Link href="/demo">See How It Works</Link>
          </Button>
        </motion.div>
      </motion.section>

      {/* Why Reviews Matter for SEO */}
      <motion.section 
        ref={whyRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24"
        initial={{ opacity: 0 }}
        animate={isWhyInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h2 
          className="text-3xl font-bold text-primary-dark mb-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isWhyInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Why Reviews Matter for SEO
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Search,
              title: "Fresh Content",
              description: "Google values fresh, relevant content. Regular reviews keep your profile active and engaging.",
              color: "text-blue-600"
            },
            {
              icon: TrendingUp,
              title: "Local Pack Rankings",
              description: "Review signals directly impact your position in Googles local 3-pack results.",
              color: "brand-text"
            },
            {
              icon: BarChart3,
              title: "Increased Visibility",
              description: "More reviews mean more keywords and long-tail search opportunities.",
              color: "text-purple-600"
            }
          ].map((item, index) => (
            <motion.div
              key={index}
              className="card-background p-8 rounded-lg shadow-sm"
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={isWhyInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.9 }}
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
              <motion.div 
                className="flex items-center justify-center mb-6"
                whileHover={{ rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <item.icon className={`h-12 w-12 ${item.color}`} />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">{item.title}</h3>
              <p className="text-secondary-dark">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* How Repruv Helps */}
      <motion.section 
        ref={howRef}
        className="section-background-alt py-24 mt-24"
        initial={{ opacity: 0 }}
        animate={isHowInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            className="text-3xl font-bold text-primary-dark mb-12 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={isHowInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            How Repruv Supercharges Your SEO
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isHowInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <ul className="space-y-4">
                {[
                  {
                    title: "Automated Response Publishing",
                    desc: "Every response adds fresh, keyword-rich content to your profile"
                  },
                  {
                    title: "Keyword Optimization",
                    desc: "AI naturally includes local keywords and service terms in responses"
                  },
                  {
                    title: "Review Velocity Tracking",
                    desc: "Monitor and improve your review acquisition rate"
                  },
                  {
                    title: "Rich Snippet Optimization",
                    desc: "Structured data helps your reviews appear in search results"
                  }
                ].map((item, index) => (
                  <motion.li 
                    key={index}
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={isHowInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    transition={{ duration: 0.6, delay: 0.6 + (index * 0.1) }}
                  >
                    <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1 text-primary-dark">{item.title}</h4>
                      <p className="text-secondary-dark">{item.desc}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div 
              className="card-background p-8 rounded-lg shadow-lg"
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={isHowInView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              <h3 className="text-xl font-semibold mb-4 text-primary-dark">SEO Impact Example</h3>
              <div className="space-y-4">
                {[
                  { label: "Local Search Visibility", value: "+47%" },
                  { label: "Click-Through Rate", value: "+32%" },
                  { label: "Map Pack Position", value: "#3 → #1" }
                ].map((stat, index) => (
                  <motion.div 
                    key={index}
                    className="flex justify-between items-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={isHowInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    transition={{ duration: 0.4, delay: 0.8 + (index * 0.1) }}
                  >
                    <span className="text-secondary-dark">{stat.label}</span>
                    <span className="text-2xl font-bold brand-text">{stat.value}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>
    </>
  );
}

function CTASection({ activeTab }: { activeTab: 'ai' | 'seo' }) {
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
          {activeTab === 'ai' 
            ? 'Experience the Future of Review Management'
            : 'Ready to Dominate Local Search?'
          }
        </motion.h2>
        <motion.p 
          className="text-xl text-secondary-dark mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isCtaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {activeTab === 'ai'
            ? 'Let AI handle the heavy lifting while you focus on your business'
            : 'Join businesses seeing 40%+ increases in local search visibility'
          }
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isCtaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button size="lg" className="button-primary" asChild>
            <Link href="/join-waitlist">Get Early Access</Link>
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
}

      {/* AI Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: activeTab === 'ai' ? 1 : 0, y: activeTab === 'ai' ? 0 : 20 }}
        transition={{ duration: 0.3 }}
        style={{ display: activeTab === 'ai' ? 'block' : 'none' }}
      >
        {/* AI Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 brand-background text-[var(--brand-primary)] px-4 py-2 rounded-full text-sm font-medium mb-6">
            <FaMagic className="h-4 w-4" />
            Powered by Advanced AI
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary-dark mb-6">
            AI That Speaks Your Brand&apos;s Language
          </h1>
          <p className="text-xl text-secondary-dark mb-8 max-w-3xl mx-auto">
            Generate personalized responses that maintain your unique voice while saving 80% of response time
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="button-primary" asChild>
              <Link href="/join-waitlist">Try AI Response Generator</Link>
            </Button>
            <Button size="lg" variant="secondary" className="button-secondary" asChild>
              <Link href="/demo">Watch Demo</Link>
            </Button>
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <h2 className="text-3xl font-bold text-primary-dark mb-12 text-center">
            How Our AI Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <FaBrain className="h-12 w-12 brand-text" />
                </div>
                <CardTitle>1. Learn Your Voice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary-dark">
                  Our AI analyzes your past responses and brand guidelines to understand your unique communication style.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <FaMagic className="h-12 w-12 brand-text" />
                </div>
                <CardTitle>2. Generate Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary-dark">
                  Creates contextual, personalized responses for each review that sound authentically like you.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <FaChartLine className="h-12 w-12 brand-text" />
                </div>
                <CardTitle>3. Improve Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary-dark">
                  Every edit you make helps the AI better understand your preferences and improve future responses.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* AI Features */}
        <section className="section-background-alt py-24 mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-primary-dark mb-12 text-center">
              Advanced AI Features
            </h2>
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-2xl font-semibold mb-6 text-primary-dark">Smart Response Generation</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <span className="text-[var(--foreground)]/70 dark:text-[var(--brand-primary)] mr-3">✓</span>
                    <div className="text-body-dark">
                      <strong>Context-Aware</strong> - Understands review sentiment and responds appropriately
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[var(--foreground)]/70 dark:text-[var(--brand-primary)] mr-3">✓</span>
                    <div className="text-body-dark">
                      <strong>Brand Consistent</strong> - Maintains your tone whether professional, friendly, or casual
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[var(--foreground)]/70 dark:text-[var(--brand-primary)] mr-3">✓</span>
                    <div className="text-body-dark">
                      <strong>Personalized</strong> - References specific details mentioned in reviews
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[var(--foreground)]/70 dark:text-[var(--brand-primary)] mr-3">✓</span>
                    <div>
                      <strong>Multi-language</strong> - Coming soon: respond in the reviewer&apos;s language
                    </div>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-6">Natural Language Insights</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <span className="text-[var(--foreground)]/70 dark:text-[var(--brand-primary)] mr-3">✓</span>
                    <div>
                      <strong>Ask Anything</strong> - Query your reviews in plain English
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[var(--foreground)]/70 dark:text-[var(--brand-primary)] mr-3">✓</span>
                    <div>
                      <strong>Trend Detection</strong> - Automatically identifies emerging issues
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[var(--foreground)]/70 dark:text-[var(--brand-primary)] mr-3">✓</span>
                    <div>
                      <strong>Sentiment Analysis</strong> - Understand customer emotions at scale
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[var(--foreground)]/70 dark:text-[var(--brand-primary)] mr-3">✓</span>
                    <div>
                      <strong>Actionable Recommendations</strong> - Get specific improvement suggestions
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* AI Stats */}
        <section className="py-24 section-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold status-info mb-2">92%</div>
                <p className="text-secondary-dark">Response Acceptance Rate</p>
              </div>
              <div>
                <div className="text-4xl font-bold status-info mb-2">10min</div>
                <p className="text-secondary-dark">Average Response Time</p>
              </div>
              <div>
                <div className="text-4xl font-bold status-info mb-2">4.8/5</div>
                <p className="text-secondary-dark">Customer Satisfaction</p>
              </div>
              <div>
                <div className="text-4xl font-bold status-info mb-2">80%</div>
                <p className="text-secondary-dark">Time Saved</p>
              </div>
            </div>
          </div>
        </section>
      </motion.div>

      {/* SEO Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: activeTab === 'seo' ? 1 : 0, y: activeTab === 'seo' ? 0 : 20 }}
        transition={{ duration: 0.3 }}
        style={{ display: activeTab === 'seo' ? 'block' : 'none' }}
      >
        {/* SEO Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-dark mb-6">
            Reviews That Boost Your Local SEO
          </h1>
          <p className="text-xl text-secondary-dark mb-8 max-w-3xl mx-auto">
            Turn customer feedback into search engine gold with our SEO-optimized review management
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="button-primary border-0" asChild>
              <Link href="/join-waitlist">Get Early Access</Link>
            </Button>
            <Button size="lg" variant="outline" className="button-secondary" asChild>
              <Link href="/demo">See How It Works</Link>
            </Button>
          </div>
        </section>

        {/* Why Reviews Matter for SEO */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <h2 className="text-3xl font-bold text-primary-dark mb-12 text-center">
            Why Reviews Matter for SEO
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-background p-8 rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-6">
                <Search className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Fresh Content</h3>
              <p className="text-secondary-dark">
                Google values fresh, relevant content. Regular reviews keep your profile active and engaging.
              </p>
            </div>
            <div className="card-background p-8 rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-6">
                <TrendingUp className="h-12 w-12 brand-text" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Local Pack Rankings</h3>
              <p className="text-secondary-dark">
                Review signals directly impact your position in Googles local 3-pack results.
              </p>
            </div>
            <div className="card-background p-8 rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-6">
                <BarChart3 className="h-12 w-12 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Increased Visibility</h3>
              <p className="text-secondary-dark">
                More reviews mean more keywords and long-tail search opportunities.
              </p>
            </div>
          </div>
        </section>

        {/* How Repruv Helps */}
        <section className="section-background-alt py-24 mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-primary-dark mb-12 text-center">
              How Repruv Supercharges Your SEO
            </h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1 text-primary-dark">Automated Response Publishing</h4>
                      <p className="text-secondary-dark">
                        Every response adds fresh, keyword-rich content to your profile
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1 text-primary-dark">Keyword Optimization</h4>
                      <p className="text-secondary-dark">
                        AI naturally includes local keywords and service terms in responses
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1 text-primary-dark">Review Velocity Tracking</h4>
                      <p className="text-secondary-dark">
                        Monitor and improve your review acquisition rate
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1 text-primary-dark">Rich Snippet Optimization</h4>
                      <p className="text-secondary-dark">
                        Structured data helps your reviews appear in search results
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="card-background p-8 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-primary-dark">SEO Impact Example</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-dark">Local Search Visibility</span>
                    <span className="text-2xl font-bold brand-text">+47%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-dark">Click-Through Rate</span>
                    <span className="text-2xl font-bold brand-text">+32%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-dark">Map Pack Position</span>
                    <span className="text-2xl font-bold brand-text">#3 → #1</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>
    </>
  );
}

function CTASection({ activeTab }: { activeTab: 'ai' | 'seo' }) {
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
          {activeTab === 'ai' 
            ? 'Experience the Future of Review Management'
            : 'Ready to Dominate Local Search?'
          }
        </motion.h2>
        <motion.p 
          className="text-xl text-secondary-dark mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isCtaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {activeTab === 'ai'
            ? 'Let AI handle the heavy lifting while you focus on your business'
            : 'Join businesses seeing 40%+ increases in local search visibility'
          }
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isCtaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button size="lg" className="button-primary" asChild>
            <Link href="/join-waitlist">Get Early Access</Link>
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
}