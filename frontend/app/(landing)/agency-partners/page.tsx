'use client';

import type { Metadata } from 'next';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Users, TrendingUp, MessageCircle, Lock, Zap, 
  CheckCircle, Calendar, BarChart3, Shield, Headphones,
  ArrowRight, Rocket, Target, DollarSign
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Agency Partner Program - Build With Us | Repruv',
  description: 'Partner with Repruv to help your creators grow channels and increase revenue. Free during beta, preferential pricing at launch. Limited spots available.',
};

export default function AgencyPartnersPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });

  const whyPartnerBenefits = [
    {
      icon: TrendingUp,
      title: 'Drive Creator Revenue Growth',
      points: [
        'Capture more monetization opportunities',
        'Grow channels faster with data insights',
        'Save time with automation',
        'Result: Creators earn more, stay longer, refer others'
      ]
    },
    {
      icon: MessageCircle,
      title: 'Shape the Product',
      points: [
        'Monthly strategy calls with founding team',
        'Feature prioritization input',
        'Early access to new features',
        'Co-design sessions for agency tools'
      ]
    },
    {
      icon: Lock,
      title: 'Lock In Preferential Pricing',
      points: [
        'Free unlimited access during development',
        '30-40% off launch pricing, locked in forever',
        'No long-term contracts',
        'Annual savings: £4,560 for 20 creators'
      ]
    }
  ];

  const availableFeatures = [
    'Full creator features for your roster',
    'YouTube & Instagram automation - Working today',
    'AI-powered engagement and revenue insights',
    'Analytics and reporting',
    'Cross-platform dashboard'
  ];

  const q1Features = [
    'Multi-creator management dashboard',
    'Team collaboration workflows',
    'Bulk creator onboarding',
    'Agency-level analytics',
    'Permission management'
  ];

  const q2Features = [
    'Client-facing reports with white-label',
    'Revenue attribution tracking',
    'Custom integrations via API',
    'Advanced automation workflows',
    'Full rebrand capability'
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Discovery Call',
      duration: '30 minutes',
      description: 'We discuss your agency structure, creator roster, biggest challenges, and whether Repruv is a good fit.',
      action: 'Schedule Discovery Call'
    },
    {
      step: '2',
      title: 'Partnership Agreement',
      duration: 'Week 1',
      description: 'Agree on pilot size, set expectations, schedule setup call, and finalize agency features for your needs.',
      action: null
    },
    {
      step: '3',
      title: 'Setup & Onboarding',
      duration: 'Week 2-3',
      description: 'Build core agency features, setup call, create invite codes, onboard first pilot group (5-10 creators).',
      action: null
    },
    {
      step: '4',
      title: 'Pilot Phase',
      duration: 'Month 1-2',
      description: 'Creators start using Repruv, we monitor usage, gather feedback, monthly check-ins, iterate on features.',
      action: null
    },
    {
      step: '5',
      title: 'Scale Together',
      duration: 'Month 3+',
      description: 'Expand to more creators, advanced features roll out, prepare for launch with preferential pricing.',
      action: null
    }
  ];

  const faqs = [
    {
      question: 'Do we have to pay anything during Early Access?',
      answer: 'No. Everything is free during development. You only pay when we officially launch, and you\'ll get 30-40% off standard pricing locked in.'
    },
    {
      question: 'What\'s the time commitment?',
      answer: 'About 2 hours/month for structured feedback calls, plus time for your team and creators to actually use the platform. We want real usage, not just opinions.'
    },
    {
      question: 'When will agency features be ready?',
      answer: 'Core agency dashboard and multi-creator management targeting end of January 2025. Advanced features (white-label, API, advanced reporting) in Q2 2025.'
    },
    {
      question: 'Can we pilot with just a few creators first?',
      answer: 'Yes! Start with 5-10 creators to test, then expand once you see value. We prefer quality over quantity in pilot phase.'
    },
    {
      question: 'Do we get to keep the preferential pricing forever?',
      answer: 'Yes. Whatever discount we agree on (30-40% off) is locked in for as long as you\'re a customer. No price increases.'
    },
    {
      question: 'Can our creators use this if they leave our agency?',
      answer: 'Yes. Creators own their accounts and data. If they leave your agency, they disconnect from your org and keep using Repruv independently.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section ref={heroRef} className="relative py-20 md:py-32 section-background overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(51, 65, 85) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-dark mb-6">
              Agency Partner Program
            </h1>
            <p className="text-xl md:text-2xl text-secondary-dark max-w-4xl mx-auto mb-8">
              Build the Future of Creator Monetization With Us
            </p>
            <p className="text-lg text-secondary-dark max-w-3xl mx-auto">
              We're developing Repruv's agency features in partnership with forward-thinking social media agencies. Instead of building in isolation, we're creating tools that solve real agency problems and help your creators make more money.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button asChild size="lg" className="bg-holo-mint hover:bg-holo-mint-dark text-white px-8 py-6 text-lg">
              <Link href="mailto:partners@repruv.co.uk">
                Apply for Partnership
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-holo-mint text-holo-mint hover:bg-muted px-8 py-6 text-lg">
              <Link href="mailto:partners@repruv.co.uk">
                Schedule Discovery Call
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Why Partner With Repruv */}
      <section className="py-16 md:py-24 section-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-12 text-center">
            Why Partner With Repruv?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {whyPartnerBenefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className="glass-panel rounded-2xl p-8"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <benefit.icon className="w-12 h-12 text-holo-mint mb-4" />
                <h3 className="text-xl font-bold text-primary-dark mb-4">{benefit.title}</h3>
                <ul className="space-y-2">
                  {benefit.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-secondary-dark">
                      <CheckCircle className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Pricing Highlight */}
          <motion.div
            className="glass-panel rounded-2xl p-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center">
              <DollarSign className="w-16 h-16 text-holo-mint mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-primary-dark mb-4">Partner Pricing Example</h3>
              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div>
                  <p className="text-secondary-dark mb-2">
                    <strong className="text-primary-dark">Standard (after launch):</strong>
                  </p>
                  <p className="text-lg text-secondary-dark">
                    £250/mo base + £35/creator = <strong className="text-red-600">£950/mo</strong> for 20 creators
                  </p>
                </div>
                <div>
                  <p className="text-secondary-dark mb-2">
                    <strong className="text-primary-dark">Partner rate (40% off):</strong>
                  </p>
                  <p className="text-lg text-secondary-dark">
                    £150/mo base + £21/creator = <strong className="text-holo-mint">£570/mo</strong> for 20 creators
                  </p>
                </div>
              </div>
              <p className="text-xl font-bold text-holo-mint mt-6">
                Annual savings: £4,560
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What We're Building */}
      <section className="py-16 md:py-24 section-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-12 text-center">
            What We're Building for Agencies
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Available Now */}
            <motion.div
              className="glass-panel rounded-2xl p-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-8 h-8 text-holo-mint" />
                <h3 className="text-2xl font-bold text-primary-dark">Available Now</h3>
              </div>
              <p className="text-secondary-dark mb-4 text-sm">Your creators can start using these features immediately.</p>
              <ul className="space-y-3">
                {availableFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-secondary-dark">
                    <CheckCircle className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Q1 2025 */}
            <motion.div
              className="glass-panel rounded-2xl p-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Rocket className="w-8 h-8 text-holo-teal" />
                <h3 className="text-2xl font-bold text-primary-dark">In Development (Q1 2025)</h3>
              </div>
              <ul className="space-y-3">
                {q1Features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-secondary-dark">
                    <span className="text-holo-teal">🚧</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Q2 2025 */}
            <motion.div
              className="glass-panel rounded-2xl p-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-8 h-8 text-holo-purple" />
                <h3 className="text-2xl font-bold text-primary-dark">Coming Q2 2025</h3>
              </div>
              <ul className="space-y-3">
                {q2Features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-secondary-dark">
                    <span className="text-holo-purple">🚧</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.p
            className="text-center mt-8 text-secondary-dark italic"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            💡 Your input drives priority. Tell us what features matter most to you.
          </motion.p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 section-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-12 text-center">
            How It Works
          </h2>

          <div className="space-y-6">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.step}
                className="glass-panel rounded-2xl p-6 md:p-8"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-holo-mint to-holo-teal flex items-center justify-center text-white text-2xl font-bold">
                      {step.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-primary-dark">{step.title}</h3>
                      <span className="text-sm text-secondary-dark bg-muted px-3 py-1 rounded-full">
                        {step.duration}
                      </span>
                    </div>
                    <p className="text-secondary-dark">{step.description}</p>
                  </div>
                  {step.action && (
                    <Button asChild className="bg-holo-mint hover:bg-holo-mint-dark text-white">
                      <Link href="mailto:partners@repruv.co.uk">
                        {step.action}
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 md:py-24 section-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-12 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                className="glass-panel rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <h3 className="text-lg font-bold text-primary-dark mb-3">{faq.question}</h3>
                <p className="text-secondary-dark">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 section-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="glass-panel rounded-2xl p-8 md:p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-4">
              Ready to Partner?
            </h2>
            <p className="text-lg text-secondary-dark mb-8 max-w-2xl mx-auto">
              We're having discovery calls with interested agencies now. Limited partner spots available - we're capping at 5 launch partners to ensure quality relationships.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-holo-mint hover:bg-holo-mint-dark text-white px-8 py-6 text-lg">
                <Link href="mailto:partners@repruv.co.uk">
                  Schedule Discovery Call
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-2 border-holo-mint text-holo-mint hover:bg-muted px-8 py-6 text-lg">
                <Link href="mailto:partners@repruv.co.uk">
                  Email Us
                </Link>
              </Button>
            </div>
            <p className="text-sm text-secondary-dark mt-6">
              <strong>Contact:</strong> partners@repruv.co.uk | Response Time: Within 24 hours
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
