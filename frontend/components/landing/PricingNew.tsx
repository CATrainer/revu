'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Check, X, Rocket, Lock, Users, Zap, Shield, 
  TrendingUp, Star, ChevronDown, Headphones
} from 'lucide-react';

export function PricingNew() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(0);

  const faqs = [
    {
      category: "About Early Access",
      questions: [
        {
          q: "What is Early Access and why is it free?",
          a: "Early Access means you get full access to Repruv while we're refining it based on real creator feedback. It's free because we want you to help us build the best tool possible. Your usage and feedback are incredibly valuable to us."
        },
        {
          q: "When will you start charging?",
          a: "We plan to launch paid tiers in Q2 2025. All Early Access users will get at least 30 days notice and special pricing options. Free tier will always exist."
        },
        {
          q: "Is this really unlimited during Early Access?",
          a: "Yes. No limits on AI responses, platforms, or features. We want you to use it heavily so we can learn what works and what doesn't."
        }
      ]
    },
    {
      category: "About Founder Pricing",
      questions: [
        {
          q: "What exactly does Founder Pricing get me?",
          a: "One payment of £99 now = lifetime access to Pro tier features (valued at £19.99/month or £240/year when we launch). You never pay subscription fees for Pro tier, ever."
        },
        {
          q: "Is it really lifetime?",
          a: "Yes. As long as Repruv exists, you have Pro access with no recurring charges."
        },
        {
          q: "What if Repruv shuts down?",
          a: "While we're building for the long term, if we ever shut down, all Founder Pricing purchasers receive a full refund. That's our commitment to early supporters."
        }
      ]
    },
    {
      category: "For Agencies",
      questions: [
        {
          q: "Can I try it with my creators now?",
          a: "Yes! During Early Access, you and your creators can use all creator features individually. Agency management features are coming soon, but the core automation and intelligence works today."
        },
        {
          q: "What will agency pricing look like?",
          a: "£250/month base fee (agency dashboard + team tools) + £35/month per creator. Early Access agency partners get 30-40% off these rates locked in forever."
        },
        {
          q: "Can we be a launch partner?",
          a: "Yes! We're actively seeking 3-5 agency launch partners. Free access during development, direct input on features, preferential pricing at launch. Visit our Agency Partners page or email partners@repruv.co.uk"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen py-16">
      {/* Hero */}
      <section ref={heroRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--brand-primary)] mb-4">
            Pricing That Grows With Your Revenue
          </h1>
          <p className="text-xl text-[var(--text-secondary)]">
            Invest in tools that increase your revenue
          </p>
        </motion.div>
      </section>

      {/* Early Access - Free Unlimited */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <motion.div
          className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-holo-mint/20 to-holo-teal/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Rocket className="w-8 h-8 text-holo-mint" />
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--brand-primary)]">Early Access - Unlimited Free</h2>
            </div>

            <p className="text-xl text-center text-[var(--text-secondary)] mb-8 max-w-3xl mx-auto">
              During Early Access, <strong className="text-holo-mint">all users get unlimited access to all available features</strong> completely free.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                {[
                  'Unlimited AI responses',
                  'YouTube & Instagram automation',
                  'AI Creator Assistant',
                  'Full analytics',
                  'Priority feature requests',
                  'First access to new features'
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--text-secondary)]">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold text-holo-mint mb-4">FREE</div>
                  <p className="text-lg text-[var(--text-secondary)] mb-6">Everything unlimited</p>
                  <Button asChild size="lg" className="bg-holo-mint hover:bg-holo-mint-dark text-white px-12 py-6 text-lg">
                    <Link href="/signup">Join Early Access</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Founder Pricing */}
      <section id="founder-pricing" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <motion.div
          className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden border-2 border-holo-mint"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="absolute top-0 left-0 bg-gradient-to-r from-holo-mint to-holo-teal px-6 py-2 rounded-br-2xl">
            <span className="text-white font-bold flex items-center gap-2">
              <Star className="w-4 h-4" />
              LIMITED TIME
            </span>
          </div>

          <div className="relative z-10 mt-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Lock className="w-8 h-8 text-holo-mint" />
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--brand-primary)]">Lock In Founder Pricing</h2>
            </div>

            <div className="text-center mb-8">
              <div className="text-5xl md:text-6xl font-bold text-holo-mint mb-2">£99</div>
              <p className="text-lg text-[var(--text-secondary)]">One-time • Lifetime Pro Access</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
              <div className="space-y-3">
                {[
                  'Lifetime Pro Tier Access',
                  '50% Off Forever',
                  'Save £140+ in year one',
                  'Exclusive Founder Badge',
                  'Priority Support forever',
                  'Early access to everything'
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--text-secondary)] font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="bg-muted rounded-2xl p-6">
                <h3 className="font-bold text-[var(--foreground)] mb-3">Value Breakdown:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Pro at launch:</span>
                    <span className="font-bold">£19.99/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Annual value:</span>
                    <span className="font-bold">£240/year</span>
                  </div>
                  <div className="flex justify-between text-holo-mint">
                    <span className="font-bold">5-year savings:</span>
                    <span className="font-bold text-lg">£1,100+</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button asChild size="lg" className="bg-holo-mint hover:bg-holo-mint-dark text-white px-12 py-6 text-lg mb-3">
                <Link href="/signup">Secure Founder Pricing - £99</Link>
              </Button>
              <p className="text-sm text-[var(--text-muted)]">Full refund if we shut down • No recurring fees ever</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Planned Launch Pricing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--brand-primary)] mb-4">
            Planned Launch Pricing (Q2 2025)
          </h2>
          <p className="text-lg text-[var(--text-secondary)]">
            Lock in Founder Pricing now to save up to 50%
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {/* Free Plan */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl font-bold text-[var(--brand-primary)] mb-2">Free Plan</h3>
            <div className="text-3xl font-bold text-[var(--brand-primary)] mb-6">$0<span className="text-lg text-[var(--text-secondary)]">/mo</span></div>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Perfect for trying Repruv</p>

            <div className="space-y-3 mb-6">
              {[
                { included: true, text: 'Up to 2 platform connections' },
                { included: true, text: 'Limited automation usage' },
                { included: true, text: 'Community support' }
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-holo-mint flex-shrink-0" />
                  <span className="text-[var(--text-secondary)] text-sm">{feature.text}</span>
                </div>
              ))}
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link href="/signup">Join Early Access for Free</Link>
            </Button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            className="glass-panel rounded-2xl p-8 border-2 border-holo-mint relative"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-holo-mint text-white px-4 py-1 rounded-full text-sm font-bold">
              MOST POPULAR
            </div>

            <h3 className="text-xl font-bold text-primary-dark mb-2">Pro Plan</h3>
            <div className="text-3xl font-bold text-holo-mint mb-2">$34.99<span className="text-lg text-secondary-dark">/mo</span></div>
            <p className="text-xs text-secondary-dark mb-6">Annual: $349/year (save 17%)</p>
            <p className="text-sm text-secondary-dark mb-6">For creators serious about growth</p>

            <div className="space-y-3 mb-6">
              {[
                'Up to 3 platform connections',
                'Standard automation usage',
                'Priority support'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-holo-mint flex-shrink-0" />
                  <span className="text-secondary-dark text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-secondary-dark mb-4 italic">Need more? Additional usage available - contact us for pricing</p>

            <Button asChild className="w-full bg-holo-mint hover:bg-holo-mint-dark text-white">
              <Link href="/signup">Join Early Access for Free</Link>
            </Button>
            <p className="text-xs text-center text-secondary-dark mt-2">Start free, upgrade at launch</p>
          </motion.div>

          {/* Max Plan */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="text-xl font-bold text-primary-dark mb-2">Max Plan</h3>
            <div className="text-3xl font-bold text-primary-dark mb-6">$84.99<span className="text-lg text-secondary-dark">/mo</span></div>
            <p className="text-sm text-secondary-dark mb-6">For power users and growing channels</p>

            <div className="space-y-3 mb-6">
              {[
                'Unlimited platform connections',
                'High-volume automation usage',
                'Priority support'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-holo-mint flex-shrink-0" />
                  <span className="text-secondary-dark text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-secondary-dark mb-4 italic">Need more? Additional usage available - contact us for pricing</p>

            <Button asChild variant="outline" className="w-full">
              <Link href="/signup">Join Early Access for Free</Link>
            </Button>
            <p className="text-xs text-center text-secondary-dark mt-2">Start free, upgrade at launch</p>
          </motion.div>

          {/* Agency Plan */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xl font-bold text-primary-dark mb-2">Agency Plan</h3>
            <div className="text-3xl font-bold text-primary-dark mb-6">Custom</div>
            <p className="text-sm text-secondary-dark mb-6">For agencies managing multiple creators</p>

            <div className="space-y-3 mb-6">
              {[
                'Multi-creator dashboard',
                'Team collaboration tools',
                'Client reporting (white-label)',
                'Dedicated account manager',
                'Bulk creator onboarding'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-holo-mint flex-shrink-0" />
                  <span className="text-secondary-dark text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Button asChild variant="outline" className="w-full border-2 border-holo-mint text-holo-mint">
              <Link href="/agency-partners">Apply for Agency Partnership</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-dark text-center mb-12">
          Frequently Asked Questions
        </h2>

        <div className="space-y-6">
          {faqs.map((category, catIndex) => (
            <div key={catIndex} className="glass-panel rounded-xl p-6">
              <h3 className="text-xl font-bold text-primary-dark mb-4">{category.category}</h3>
              <div className="space-y-4">
                {category.questions.map((faq, qIndex) => (
                  <div key={qIndex} className="border-b border-border last:border-0 pb-4 last:pb-0">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === catIndex * 100 + qIndex ? null : catIndex * 100 + qIndex)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <span className="font-semibold text-primary-dark pr-4">{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-secondary-dark flex-shrink-0 transition-transform ${expandedFAQ === catIndex * 100 + qIndex ? 'transform rotate-180' : ''}`} />
                    </button>
                    {expandedFAQ === catIndex * 100 + qIndex && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-secondary-dark mt-3"
                      >
                        {faq.a}
                      </motion.p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="glass-panel rounded-2xl p-8 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Headphones className="w-12 h-12 text-holo-mint mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-primary-dark mb-3">Still Have Questions?</h3>
          <p className="text-secondary-dark mb-6">Our team is here to help</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-holo-mint hover:bg-holo-mint-dark text-white">
              <Link href="mailto:support@repruv.co.uk">Contact Support</Link>
            </Button>
            <Button asChild variant="outline" className="border-2 border-holo-mint text-holo-mint hover:bg-muted">
              <Link href="/agency-partners">Agency Partners →</Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
