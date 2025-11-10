'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Check, X, Rocket, Lock, Users, Zap, Shield, 
  TrendingUp, MessageCircle, BarChart3, Star, DollarSign,
  Headphones, CreditCard, AlertCircle
} from 'lucide-react';

export default function PricingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen py-16">
      {/* Hero */}
      <section ref={heroRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-[var(--brand-primary)] mb-4">
            Pricing That Grows With Your Revenue
          </h1>
          <p className="text-2xl text-[var(--success)] mb-2 font-semibold">
            Invest in tools that increase your revenue
          </p>
        </motion.div>
      </section>

      {/* Early Access & Founder Pricing - Side by Side */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Early Access - Free Unlimited */}
          <motion.div
            className="glass-panel rounded-3xl p-8 relative overflow-hidden flex flex-col h-full"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-holo-mint/20 to-holo-teal/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Rocket className="w-8 h-8 text-holo-mint" />
                  <h2 className="text-4xl md:text-5xl font-bold text-[var(--brand-primary)]">Early Access</h2>
                </div>
                
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-[var(--success)] mb-2">FREE</div>
                </div>

                <p className="text-center text-[var(--success)] mb-6 text-sm font-bold">
                  During Early Access, all users get unlimited access to all features completely free.
                </p>
              </div>

              <div className="flex-grow">
                <h3 className="font-bold text-lg text-[var(--brand-primary)] mb-4">What&apos;s Included:</h3>
                <div className="space-y-3">
                  {[
                    'Unlimited AI responses across all your content',
                    'YouTube & Instagram automation',
                    'AI Creator Assistant with revenue insights',
                    'Full analytics and opportunity identification',
                    'Priority feature requests and direct feedback channel',
                    'First access to new platforms and features'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-secondary-dark font-bold">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button asChild size="lg" className="bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-black px-12 py-6 text-lg w-full mt-8 font-bold">
                <Link href="/signup">
                  Join Early Access - Free
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Founder Pricing */}
          <motion.div
            className="glass-panel rounded-3xl p-8 relative overflow-hidden border-2 border-holo-mint flex flex-col h-full"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="absolute top-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-500 px-6 py-2 rounded-br-2xl">
              <span className="text-gray-900 dark:text-gray-900 font-bold flex items-center gap-2 text-sm">
                <Star className="w-4 h-4" />
                LIMITED TIME
              </span>
            </div>

            <div className="relative z-10 mt-8 flex flex-col h-full">
              <div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Lock className="w-8 h-8 text-holo-mint" />
                  <h2 className="text-4xl md:text-5xl font-bold text-[var(--brand-primary)]">Founder Pricing</h2>
                </div>
                
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-[var(--success)] mb-2">£99</div>
                  <p className="text-lg text-[var(--brand-primary)] font-bold">One-time Payment • Lifetime access</p>
                </div>

                <p className="text-center text-[var(--success)] mb-6 text-sm font-bold">
                  Support our development and secure exclusive lifetime pricing before launch.
                </p>
              </div>

              <div className="flex-grow">
                <h3 className="font-bold text-lg text-[var(--brand-primary)] mb-4">Pay Once, Benefit Forever:</h3>
                <div className="space-y-3">
                  {[
                    'Lifetime Pro Tier Access',
                    'Never pay subscription fees',
                    'Save over £320 in year one alone',
                    'Exclusive Founder Badge',
                    'Priority Support forever',
                    'Feature Request Priority',
                    'Early Access to Everything'
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-secondary-dark font-bold">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button asChild size="lg" className="bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-black px-12 py-6 text-lg w-full mt-8 font-bold">
                <Link href="/signup">
                  Secure Founder Pricing - £99
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Planned Launch Pricing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--brand-primary)] mb-4">
            Planned Launch Pricing (Q2 2025)
          </h2>
          <p className="text-lg text-[var(--success)] font-bold">
            These prices go live when we officially launch. Lock in Founder Pricing now to get lifetime Pro Plan.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {/* Free Plan */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-[var(--brand-primary)] mb-2">Free Plan</h3>
            <div className="text-3xl font-bold text-[var(--success)] mb-6">$0<span className="text-lg text-[var(--success)]">/month</span></div>
            <p className="text-[var(--brand-primary)] mb-6 font-bold">Perfect for trying Repruv</p>

            <div className="space-y-3 mb-8">
              {[
                { included: true, text: 'Up to 2 platform connections' },
                { included: true, text: 'Limited automation usage' },
                { included: true, text: 'Community support' }
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
                  <span className="text-secondary-dark font-bold text-sm">{feature.text}</span>
                </div>
              ))}
            </div>

            <Button asChild className="w-full bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-black font-bold">
              <Link href="/signup">
                Join Early Access for Free
              </Link>
            </Button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            className="glass-panel rounded-2xl p-8 border-2 border-holo-mint relative"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 dark:text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
              MOST POPULAR
            </div>

            <h3 className="text-3xl md:text-4xl font-bold text-[var(--brand-primary)] mb-2">Pro Plan</h3>
            <div className="text-3xl font-bold text-[var(--success)] mb-2">$34.99<span className="text-lg text-[var(--success)]">/month</span></div>
            <p className="text-sm text-[var(--success)] mb-6">Annual: $349/year (save 17%)</p>
            <p className="text-[var(--brand-primary)] mb-6 font-bold">For creators serious about growth</p>

            <div className="space-y-3 mb-8">
              {[
                'Up to 3 platform connections',
                'Standard automation usage',
                'Priority support'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
                  <span className="text-secondary-dark font-bold text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-secondary-dark mb-4 italic">Need more? Additional usage available - contact us for pricing</p>

            <Button asChild className="w-full bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-black font-bold">
              <Link href="/signup">
                Join Early Access for Free
              </Link>
            </Button>
            <p className="text-xs text-center text-secondary-dark mt-2">Start free, upgrade at launch</p>
          </motion.div>

          {/* Max Plan */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-[var(--brand-primary)] mb-2">Max Plan</h3>
            <div className="text-3xl font-bold text-[var(--success)] mb-6">$84.99<span className="text-lg text-[var(--success)]">/month</span></div>
            <p className="text-[var(--brand-primary)] mb-6 font-bold">For power users and growing channels</p>

            <div className="space-y-3 mb-8">
              {[
                'Unlimited platform connections',
                'High-volume automation usage',
                'Priority support'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
                  <span className="text-secondary-dark font-bold text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-secondary-dark mb-4 italic">Need more? Additional usage available - contact us for pricing</p>

            <Button asChild className="w-full bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-black font-bold">
              <Link href="/signup">
                Join Early Access for Free
              </Link>
            </Button>
            <p className="text-xs text-center text-secondary-dark mt-2">Start free, upgrade at launch</p>
          </motion.div>

          {/* Agency Plan */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-[var(--brand-primary)] mb-2">Agency Plan</h3>
            <div className="text-3xl font-bold text-[var(--success)] mb-6">Custom</div>
            <p className="text-[var(--brand-primary)] mb-6 font-bold">For agencies managing multiple creators</p>

            <div className="space-y-3 mb-8">
              {[
                'Multi-creator dashboard',
                'Team collaboration tools',
                'Client reporting (white-label)',
                'Dedicated account manager',
                'Bulk creator onboarding'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
                  <span className="text-secondary-dark font-bold text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Button asChild className="w-full bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-black font-bold">
              <Link href="/agency-partners">
                Apply for Agency Partnership
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Continue with FAQ sections in next message due to size... */}
    </div>
  );
}
