'use client';

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

export default function AgencyPartnersPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });

  const whyPartnerBenefits = [
    {
      icon: TrendingUp,
      title: 'Reduce Creator Churn',
      points: [
        'Automated engagement keeps creators active',
        'Revenue growth makes your service more valuable',
        'Data-driven insights show tangible ROI',
        'Creators who earn more stay longer'
      ]
    },
    {
      icon: DollarSign,
      title: 'Differentiated Service You Can Charge Premium For',
      points: [
        'Offer advanced monetization tools competitors don\'t have',
        'Enterprise-level automation at agency scale',
        'White-label reporting coming Q1 2026',
        'Position as innovation leader in your market'
      ]
    },
    {
      icon: Headphones,
      title: 'Enterprise Tools Without Enterprise Complexity',
      points: [
        'Direct founder access during development',
        'Custom solutions built for your workflows',
        'No corporate bureaucracy or lengthy onboarding',
        'Priority support as launch partner'
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
      title: 'Partnership Agreement',
      duration: 'Week 1',
      description: 'Agree on pilot size, set expectations, schedule setup call, and finalize agency features for your needs.',
      action: null
    },
    {
      step: '2',
      title: 'Setup & Onboarding',
      duration: 'Week 2-3',
      description: 'Build core agency features, setup call, create invite codes, onboard first pilot group (5-10 creators).',
      action: null
    },
    {
      step: '3',
      title: 'Pilot Phase',
      duration: 'Month 1-2',
      description: 'Creators start using Repruv, we monitor usage, gather feedback, monthly check-ins, iterate on features.',
      action: null
    },
    {
      step: '4',
      title: 'Scale Together',
      duration: 'Month 3+',
      description: 'Expand to more creators, advanced features roll out, prepare for launch with preferential pricing.',
      action: null
    }
  ];

  const faqs = [
    {
      question: 'How does this integrate with our existing tools?',
      answer: 'Repruv works alongside your existing tools. Creators connect their social platforms directly to Repruv. We\'re not replacing your project management or communication tools - we\'re adding monetization intelligence. API access for custom integrations comes in Q1 2026.'
    },
    {
      question: 'What if a creator leaves our agency?',
      answer: 'Creators own their accounts and data. If they leave your agency, they disconnect from your org and keep using Repruv independently. No lock-in for them or you. This actually reduces friction in creator relationships.'
    },
    {
      question: 'What\'s the time commitment from our team?',
      answer: 'Minimal ongoing time. Initial setup takes about 1 hour for onboarding call. Monthly feedback calls are 1-2 hours. The platform is designed to save your team time with automation - not create more work.'
    },
    {
      question: 'How is our agency data protected?',
      answer: 'Your data is isolated from other agencies. Creators you onboard are linked to your organization. We don\'t share performance data between agencies. Enterprise-grade security with encrypted data storage. SOC 2 compliance planned for Q2 2026.'
    },
    {
      question: 'What\'s your tech infrastructure/uptime?',
      answer: 'Built on Google Cloud Platform with 99.9% uptime SLA. Automated backups and redundancy. Real-time monitoring and incident response. We\'re building for scale from day one - not retrofitting later.'
    },
    {
      question: 'Do we have to pay anything during Early Access?',
      answer: 'No. Everything is free during development. You only pay when we officially launch, and you\'ll get 30-40% off standard pricing locked in forever.'
    },
    {
      question: 'Can we pilot with just a few creators first?',
      answer: 'Yes! Start with 5-10 creators to test, then expand once you see value. We prefer quality over quantity in pilot phase.'
    },
    {
      question: 'Do we get to keep the preferential pricing forever?',
      answer: 'Yes. Whatever discount we agree on (30-40% off) is locked in for as long as you\'re a customer. No price increases, even as we add features.'
    }
  ];

  return (
    <div className="min-h-screen section-background">
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
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--brand-primary)] mb-6">
              Agency Partner Program
            </h1>
            <p className="text-xl md:text-2xl text-[var(--foreground)] max-w-4xl mx-auto mb-8 font-bold">
              Build the Future of Creator Monetization With Us
            </p>
            <p className="text-lg text-[var(--text-secondary)] max-w-3xl mx-auto mb-4">
              We're developing Repruv's agency features in partnership with forward-thinking social media agencies. Instead of building in isolation, we're creating tools that solve real agency problems and help your creators make more money.
            </p>
            <p className="text-sm text-[var(--success)] font-semibold">
              Currently in pilot phase with select agency partners managing 50+ creators
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button asChild size="lg" className="bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-white px-8 py-6 text-lg font-bold">
              <Link href="https://calendar.app.google/nq6qhPm1UYdZvHde8" target="_blank" rel="noopener noreferrer">
                <Calendar className="w-5 h-5 mr-2" />
                Schedule Partnership Call
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-muted px-8 py-6 text-lg font-bold">
              <Link href="mailto:partners@repruv.co.uk">
                Email Us
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Why Partner With Repruv */}
      <section className="py-16 md:py-24 section-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--brand-primary)] mb-12 text-center">
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
                <h3 className="text-2xl font-bold text-[var(--brand-primary)] mb-4">{benefit.title}</h3>
                <ul className="space-y-2">
                  {benefit.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
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
            className="glass-panel rounded-2xl p-6 md:p-8 max-w-7xl mx-auto border-2 border-holo-mint"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center">
              <h3 className="text-3xl md:text-4xl font-bold text-[var(--brand-primary)] mb-2">Partner Pricing</h3>
              <p className="text-[var(--text-secondary)] mb-6">Built for agencies, priced for partnerships</p>

              <div className="space-y-4 text-left max-w-3xl mx-auto">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-holo-mint flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-lg font-bold text-[var(--brand-primary)]">30-40% off standard rates, locked in forever</p>
                    <p className="text-sm text-[var(--text-secondary)]">Your discount never expires, even as we scale</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-holo-mint flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-lg font-bold text-[var(--brand-primary)]">Typical agency with 20 creators saves $4,000+/year</p>
                    <p className="text-sm text-[var(--text-secondary)]">ROI scales with your roster size</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-holo-mint flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-lg font-bold text-[var(--brand-primary)]">Exact pricing discussed on your discovery call</p>
                    <p className="text-sm text-[var(--text-secondary)]">Based on roster size and your specific needs</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-holo-mint flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-lg font-bold text-[var(--brand-primary)]">No payment required during Early Access</p>
                    <p className="text-sm text-[var(--text-secondary)]">Free unlimited access during development phase</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What We're Building */}
      <section className="py-16 md:py-24 section-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--brand-primary)] mb-12 text-center">
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
                <h3 className="text-3xl font-bold text-[var(--brand-primary)]">Available Now</h3>
              </div>
              <p className="text-[var(--text-secondary)] mb-4 text-sm">Your creators can start using these features immediately.</p>
              <ul className="space-y-3">
                {availableFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <CheckCircle className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* December 2025 */}
            <motion.div
              className="glass-panel rounded-2xl p-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Rocket className="w-8 h-8 text-holo-teal" />
                <h3 className="text-3xl font-bold text-primary-dark">In Development (December 2025)</h3>
              </div>
              <ul className="space-y-3">
                {q1Features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <span className="text-holo-teal">🚧</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Q1 2026 */}
            <motion.div
              className="glass-panel rounded-2xl p-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-8 h-8 text-holo-purple" />
                <h3 className="text-3xl font-bold text-primary-dark">Coming Q1 2026</h3>
              </div>
              <ul className="space-y-3">
                {q2Features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <span className="text-holo-purple">🚧</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.p
            className="text-center mt-8 text-[var(--text-secondary)] italic"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            💡 Your input drives priority. Tell us what features matter most to you.
          </motion.p>
        </div>
      </section>

      {/* Why Partner With an Early-Stage Startup? */}
      <section className="py-16 md:py-24 section-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--brand-primary)] mb-12 text-center">
            Why Partner With an Early-Stage Startup?
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              className="glass-panel rounded-2xl p-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Headphones className="w-12 h-12 text-holo-mint mb-4" />
              <h3 className="text-2xl font-bold text-[var(--brand-primary)] mb-4">Direct Line to Founders - Shape the Product</h3>
              <p className="text-[var(--text-secondary)]">
                No layers of product managers or bureaucracy. You talk directly to the founders building your features. Your feedback gets implemented in days, not quarters. We're building this for you, not at you.
              </p>
            </motion.div>

            <motion.div
              className="glass-panel rounded-2xl p-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <DollarSign className="w-12 h-12 text-holo-mint mb-4" />
              <h3 className="text-2xl font-bold text-[var(--brand-primary)] mb-4">Lock in Pricing Before We Scale</h3>
              <p className="text-[var(--text-secondary)]">
                40% savings locked in forever. Once we prove value and scale to hundreds of agencies, these partnership rates go away. Early partners get rewarded for taking the first step with us.
              </p>
            </motion.div>

            <motion.div
              className="glass-panel rounded-2xl p-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Rocket className="w-12 h-12 text-holo-mint mb-4" />
              <h3 className="text-2xl font-bold text-[var(--brand-primary)] mb-4">First-Mover Advantage in Your Market</h3>
              <p className="text-[var(--text-secondary)]">
                Be the first agency in your niche offering AI-powered creator monetization. Build case studies and prove ROI before your competitors even hear about us. Position yourself as the innovation leader.
              </p>
            </motion.div>

            <motion.div
              className="glass-panel rounded-2xl p-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Shield className="w-12 h-12 text-holo-mint mb-4" />
              <h3 className="text-2xl font-bold text-[var(--brand-primary)] mb-4">Creator Data is Portable & Owned by Creators</h3>
              <p className="text-[var(--text-secondary)]">
                No lock-in risk. Creators own their accounts and data. If they leave your agency, they disconnect from your org but keep their Repruv account. If you decide we're not a fit, your creators can continue independently or export their data.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Next Steps After Our Call */}
      <section className="py-16 md:py-24 section-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--brand-primary)] mb-12 text-center">
            Next Steps After Our Call
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
                      <h3 className="text-xl font-bold text-[var(--brand-primary)]">{step.title}</h3>
                      <span className="text-sm text-[var(--text-secondary)] bg-muted px-3 py-1 rounded-full">
                        {step.duration}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)]">{step.description}</p>
                  </div>
                  {step.action && (
                    <Button asChild className="bg-[var(--success)] hover:bg-emerald-600 text-[var(--success-foreground)] font-bold">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--brand-primary)] mb-12 text-center">
            What Agencies Ask Us
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
                <h3 className="text-lg font-bold text-[var(--brand-primary)] mb-3">{faq.question}</h3>
                <p className="text-[var(--text-secondary)]">{faq.answer}</p>
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
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--brand-primary)] mb-4">
              Ready for Next Steps?
            </h2>
            <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
              We're onboarding our first 5 agency partners now.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-white px-8 py-6 text-lg font-bold">
                <Link href="https://calendar.app.google/nq6qhPm1UYdZvHde8" target="_blank" rel="noopener noreferrer">
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule Partnership Call
                </Link>
              </Button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-6">
              Or email: <a href="mailto:partners@repruv.co.uk" className="font-bold hover:text-holo-mint transition-colors">partners@repruv.co.uk</a>
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
