'use client';
import { Pricing } from '@/components/landing/Pricing';
import { motion, LazyMotion, domAnimation, useInView } from "framer-motion";
import { ChevronDown, Users, Zap, Shield, Target, Headphones, CreditCard } from 'lucide-react';
import React from 'react';

const faqCategories = [
  {
    title: "Getting Started",
    icon: Zap,
    color: "text-blue-500",
    questions: [
      {
        question: "How does the free Basic plan work?",
        answer: "The Basic plan is completely free forever and includes up to 3 platform connections, 1,000 AI responses per month, access to Repruv AI chatbot, basic analytics, and social monitoring. No credit card required to start."
      },
      {
        question: "Which platforms do you support?",
        answer: "We support all major social media and review platforms including Google Reviews, Facebook, Instagram, TikTok, YouTube, Twitter/X, LinkedIn, Reddit, Yelp, and more. New platforms are added regularly based on user requests."
      },
      {
        question: "How quickly can I get set up?",
        answer: "Setup takes less than 5 minutes. Simply connect your social accounts, and our AI immediately starts monitoring and can begin generating responses. Most users are fully operational within 10 minutes."
      }
    ]
  },
  {
    title: "For Creators",
    icon: Target,
    color: "text-purple-500",
    questions: [
      {
        question: "Can Repruv help manage my community engagement?",
        answer: "Absolutely! Repruv monitors all your channels 24/7, alerts you to important comments, and can automatically respond to common questions while maintaining your unique voice and tone."
      },
      {
        question: "How does the AI learn my voice and style?",
        answer: "Our Enhanced Repruv AI analyzes your previous responses, content style, and brand voice to generate replies that sound authentically like you. The more you use it, the better it becomes at matching your tone."
      },
      {
        question: "What if I have multiple social media channels?",
        answer: "Perfect! The Pro plan supports up to 5 platform connections, ideal for creators managing YouTube, Instagram, TikTok, Twitter, and more. You can manage everything from one dashboard."
      },
      {
        question: "Can I see analytics for my content performance?",
        answer: "Yes! You get detailed analytics including engagement rates, sentiment analysis, response times, and AI-powered insights with recommended actions to improve your community engagement."
      }
    ]
  },
  {
    title: "For Agencies",
    icon: Users,
    color: "text-green-500",
    questions: [
      {
        question: "Can I manage multiple clients with one account?",
        answer: "Yes! The Enterprise plan is specifically designed for agencies managing multiple creators or brands. You get unlimited platform connections, multi-user access, and client-specific dashboards."
      },
      {
        question: "How does team collaboration work?",
        answer: "Enterprise includes role-based permissions, task assignments, approval workflows, internal notes, and team performance analytics. Perfect for agencies with multiple team members handling different clients."
      },
      {
        question: "Do you offer white-label solutions?",
        answer: "Yes! Enterprise clients can access white-label options, custom branding, API access, and dedicated account management. Contact us to discuss your specific agency needs."
      },
      {
        question: "What about client reporting?",
        answer: "Generate comprehensive client reports with engagement metrics, response analytics, sentiment tracking, and ROI data. All reports can be customized with your agency branding."
      }
    ]
  },
  {
    title: "Billing & Plans",
    icon: CreditCard,
    color: "text-green-500",
    questions: [
      {
        question: "Can I change plans anytime?",
        answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle. You can start with the free Basic plan and upgrade as you grow."
      },
      {
        question: "What happens when I exceed my AI response limit?",
        answer: "On the Pro plan, you can purchase additional responses for £12 per 10,000 responses. Basic plan users will need to upgrade to continue using AI responses after hitting their monthly limit."
      },
      {
        question: "Do you offer annual billing discounts?",
        answer: "Yes! Annual billing saves you 20% compared to monthly billing. Enterprise clients also have access to custom billing cycles and payment terms."
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards, PayPal, and for Enterprise clients, we can arrange bank transfers and custom invoicing."
      }
    ]
  },
  {
    title: "Security & Support",
    icon: Shield,
    color: "text-red-500",
    questions: [
      {
        question: "How secure is my data?",
        answer: "Your data is protected with bank-level encryption, SOC 2 compliance, and regular security audits. We never store your social media passwords - only secure API tokens that you can revoke anytime."
      },
      {
        question: "What kind of support do you provide?",
        answer: "Basic users get email support, Pro users get priority support with faster response times, and Enterprise clients get dedicated account management and phone support."
      },
      {
        question: "Can I export my data?",
        answer: "Yes! You can export all your data including analytics, responses, and reports at any time. We believe your data belongs to you."
      }
    ]
  }
];

// FAQ Progress Navigation Component
function FAQProgressNavigation({ 
  categories, 
  currentSection, 
  isVisible,
  onSectionClick
}: { 
  categories: typeof faqCategories;
  currentSection: number;
  isVisible: boolean;
  onSectionClick: (index: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 20 }}
      className="fixed right-6 top-1/2 transform -translate-y-1/2 z-[9999]"
    >
      <div className="relative">
        {/* Vertical Progress Track */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-600 opacity-30" />

        {/* Navigation Dots */}
        <div className="relative flex flex-col space-y-8">
          {categories.map((category, index) => (
            <div key={category.title} className="relative flex items-center group">
              {/* Section Label */}
              <motion.div
                initial={{ opacity: 0, x: 15, scale: 0.9 }}
                whileHover={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute right-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              >
                <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                    {category.title}
                  </span>
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2">
                    <div className="w-0 h-0 border-l-[8px] border-l-white/95 dark:border-l-gray-900/95 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent" />
                    <div className="absolute -left-px top-0 w-0 h-0 border-l-[8px] border-l-gray-200/50 dark:border-l-gray-700/50 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent" />
                  </div>
                </div>
              </motion.div>

              {/* Navigation Dot with Icon */}
              <motion.button
                onClick={() => onSectionClick(index)}
                className="relative flex items-center justify-center w-10 h-10 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {/* Outer Ring */}
                <motion.div
                  className={`absolute inset-0 rounded-full border transition-all duration-200 ${
                    index === currentSection
                      ? 'border-green-600 bg-green-600/10'
                      : 'border-gray-300 dark:border-gray-600 group-hover:border-green-600/60'
                  }`}
                  animate={{
                    scale: index === currentSection ? 1 : 0.85,
                    borderWidth: index === currentSection ? 2 : 1
                  }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
                
                {/* Icon */}
                <category.icon 
                  className={`w-4 h-4 transition-colors duration-200 ${
                    index === currentSection
                      ? 'text-green-600'
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-green-600'
                  }`}
                />
                
                {/* Active Pulse Effect */}
                {index === currentSection && (
                  <motion.div
                    className="absolute inset-0 rounded-full border border-green-600/30"
                    animate={{
                      scale: [1, 1.8],
                      opacity: [0.4, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                      repeatDelay: 0.5
                    }}
                  />
                )}
              </motion.button>
            </div>
          ))}
        </div>

        {/* Floating Progress Indicator */}
        <motion.div
          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
        >
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <motion.span
              className="text-xs font-bold text-green-600"
              key={currentSection}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {currentSection + 1}/{categories.length}
            </motion.span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function PricingPage() {
  const faqRef = React.useRef(null);
  const faqInView = useInView(faqRef, { once: false, amount: 0.1 });
  const [currentFAQSection, setCurrentFAQSection] = React.useState(0);
  const [showFAQProgress, setShowFAQProgress] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Record<number, boolean>>({
    0: true, // Getting Started expanded by default
    1: false,
    2: false,
    3: false,
    4: false
  });

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const scrollToSection = (index: number) => {
    // Expand the target section if it's collapsed
    setExpandedSections(prev => ({
      ...prev,
      [index]: true
    }));
    
    // Scroll to the section after a brief delay to allow for expansion
    setTimeout(() => {
      const element = document.getElementById(`faq-category-${index}`);
      if (element) {
        const yOffset = -100; // Account for fixed navigation
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  React.useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Show FAQ navigation when any part of the FAQ section is visible
          const faqSectionElement = document.getElementById('faq-section');
          
          if (faqSectionElement) {
            const sectionRect = faqSectionElement.getBoundingClientRect();
            // Show progress bar when any part of FAQ section is visible
            const isFAQVisible = sectionRect.top <= window.innerHeight && sectionRect.bottom >= 0;
            setShowFAQProgress(isFAQVisible);
          }
          
          // Find current FAQ section based on viewport position
          let activeSection = 0;
          for (let i = 0; i < faqCategories.length; i++) {
            const element = document.getElementById(`faq-category-${i}`);
            if (element) {
              const elementRect = element.getBoundingClientRect();
              // Section is active if any part is in the middle third of viewport
              if (elementRect.top <= window.innerHeight * 0.67 && elementRect.bottom >= window.innerHeight * 0.33) {
                activeSection = i;
              }
            }
          }
          setCurrentFAQSection(activeSection);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
  <LazyMotion features={domAnimation}>
    <div className="section-background">
        {/* Pricing Component */}
        <Pricing />

        {/* FAQ Section */}
        <motion.section 
          id="faq-section"
          ref={faqRef}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
          initial={{ opacity: 0, y: 50 }}
          animate={faqInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={faqInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 
              className="text-4xl md:text-5xl font-bold text-green-600 mb-6"
              data-faq-title="true"
            >
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-green-800">
              Everything you need to know about Repruv for your brand and your community
            </p>
          </motion.div>

          <div className="grid md:grid-cols-1 gap-12">
            {faqCategories.map((category, categoryIndex) => (
              <motion.div
                key={category.title}
                id={`faq-category-${categoryIndex}`}
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={faqInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: categoryIndex * 0.05 + 0.3 }}
              >
                <button
                  onClick={() => toggleSection(categoryIndex)}
                  className="flex items-center justify-between w-full text-left group"
                >
                  <div className="flex items-center gap-3">
                    <category.icon className={`h-8 w-8 ${category.color}`} />
                    <h3 className="text-2xl font-bold text-primary-dark group-hover:text-green-600 transition-colors">
                      {category.title}
                    </h3>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedSections[categoryIndex] ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-6 w-6 text-gray-500 group-hover:text-green-600 transition-colors" />
                  </motion.div>
                </button>
                
                <motion.div
                  initial={false}
                  animate={{
                    height: expandedSections[categoryIndex] ? "auto" : 0,
                    opacity: expandedSections[categoryIndex] ? 1 : 0
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="grid md:grid-cols-2 gap-6 pt-2">
                    {category.questions.map((faq, questionIndex) => (
                      <motion.div
                        key={questionIndex}
                        className="card-background rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={
                          faqInView && expandedSections[categoryIndex] 
                            ? { opacity: 1, scale: 1 } 
                            : { opacity: 0, scale: 0.98 }
                        }
                        transition={{ 
                          duration: 0.4, 
                          delay: expandedSections[categoryIndex] ? questionIndex * 0.05 + 0.1 : 0,
                          ease: "easeOut"
                        }}
                        whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                      >
                        <h4 className="text-lg font-semibold mb-3 text-primary-dark">
                          {faq.question}
                        </h4>
                        <p className="text-secondary-dark leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0, y: 30 }}
            animate={faqInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <div className="card-background rounded-lg p-8">
              <Headphones className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-primary-dark mb-2">
                Still have questions?
              </h3>
              <p className="text-secondary-dark mb-4">
                Our team is here to help you choose the right plan for your needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/contact" 
                  className="inline-flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
                >
                  Contact Support
                </a>
                <a 
                  href="/demo" 
                  className="inline-flex items-center px-6 py-3 border border-green-500 text-green-500 hover:bg-green-50 font-medium rounded-lg transition-colors"
                >
                  Request Demo
                </a>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* FAQ Progress Navigation */}
        <FAQProgressNavigation 
          categories={faqCategories} 
          currentSection={currentFAQSection} 
          isVisible={showFAQProgress}
          onSectionClick={scrollToSection}
        />
      </div>
    </LazyMotion>
  );
}