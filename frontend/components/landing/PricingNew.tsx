'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Check, X, Lock, Zap, Star, ChevronDown, Headphones, Sparkles,
  MessageSquare, BarChart3, Crown
} from 'lucide-react';

export function PricingNew() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(0);

  // Feature comparison for Free vs Pro - based on actual system pages
  const featureComparison = [
    { feature: 'Brand Opportunities', free: true, pro: true, description: 'Browse and apply to brand partnership deals' },
    { feature: 'Account Settings', free: true, pro: true, description: 'Manage your profile and preferences' },
    { feature: 'Creator Dashboard', free: false, pro: true, description: 'Your central hub for all creator activity' },
    { feature: 'AI Creator Assistant', free: false, pro: true, description: 'Chat with AI to get content ideas and strategy' },
    { feature: 'Analytics & Insights', free: false, pro: true, description: 'Track performance across all your channels' },
    { feature: 'Comment Management', free: false, pro: true, description: 'View, filter, and respond to audience comments' },
    { feature: 'AI-Powered Responses', free: false, pro: true, description: 'Generate intelligent replies to comments' },
    { feature: 'Monetization Tools', free: false, pro: true, description: 'Track earnings and optimize revenue streams' },
    { feature: 'Platform Integrations', free: false, pro: true, description: 'Connect YouTube, Instagram, and more' },
  ];

  const faqs = [
    {
      category: "About Free & Pro Tiers",
      questions: [
        {
          q: "What can I do on the Free tier?",
          a: "Free tier gives you access to browse brand opportunities and manage your account settings. It's perfect for exploring partnership deals and getting started."
        },
        {
          q: "What does Pro unlock?",
          a: "Pro unlocks the full Repruv experience: your Creator Dashboard, AI Creator Assistant for content strategy, AI-powered comment responses, analytics & insights, monetization tracking, and platform integrations for YouTube and Instagram."
        },
        {
          q: "How does the 30-day free trial work?",
          a: "Sign up and add a payment method to start your Pro trial. You get full Pro access for 30 days completely free. Cancel anytime before the trial ends and you won't be charged."
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
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
            Start free, upgrade when you&apos;re ready. Try Pro free for 30 days.
          </p>
        </motion.div>
      </section>

      {/* Three Tier Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* Free Tier Card */}
          <motion.div
            className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-[var(--brand-primary)] mb-1">Free</h2>
              <p className="text-[var(--text-secondary)] text-sm">Get started with brand opportunities</p>
            </div>

            <div className="mb-6">
              <div className="text-4xl font-bold text-[var(--brand-primary)]">£0</div>
              <p className="text-[var(--text-secondary)] text-sm">Forever free</p>
            </div>

            <div className="space-y-3 mb-6 flex-grow">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                <span className="text-[var(--foreground)] text-sm">Brand Opportunities</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                <span className="text-[var(--foreground)] text-sm">Account Settings</span>
              </div>
              <div className="flex items-start gap-2">
                <X className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                <span className="text-[var(--text-muted)] text-sm">Creator Dashboard</span>
              </div>
              <div className="flex items-start gap-2">
                <X className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                <span className="text-[var(--text-muted)] text-sm">AI Assistant & Responses</span>
              </div>
              <div className="flex items-start gap-2">
                <X className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                <span className="text-[var(--text-muted)] text-sm">Analytics & Monetization</span>
              </div>
              <div className="flex items-start gap-2">
                <X className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                <span className="text-[var(--text-muted)] text-sm">Platform Integrations</span>
              </div>
            </div>

            <Button asChild variant="outline" size="lg" className="w-full py-5 text-base border-2 border-[var(--border)] text-[var(--foreground)] hover:bg-muted">
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </motion.div>

          {/* Pro Tier Card */}
          <motion.div
            className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden border-2 border-holo-mint flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-holo-mint/20 to-holo-teal/20 rounded-full blur-3xl"></div>
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-holo-mint to-holo-teal px-4 py-1.5 rounded-b-xl">
              <span className="text-white font-bold flex items-center gap-1.5 text-xs">
                <Crown className="w-3.5 h-3.5" />
                RECOMMENDED
              </span>
            </div>

            <div className="relative z-10 mt-3 flex flex-col flex-grow">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-holo-mint mb-1">Pro</h2>
                <p className="text-[var(--text-secondary)] text-sm">Full platform access & AI automation</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <div className="text-4xl font-bold text-holo-mint">£19.99</div>
                  <span className="text-[var(--text-secondary)] text-sm">/month</span>
                </div>
                <p className="text-holo-mint font-medium text-sm">30-day free trial</p>
              </div>

              <div className="space-y-3 mb-6 flex-grow">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">Everything in Free</span>
                </div>
                <div className="flex items-start gap-2">
                  <BarChart3 className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">Creator Dashboard</span>
                </div>
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">AI Creator Assistant</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">AI-Powered Responses</span>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">Analytics & Monetization</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">Platform Integrations</span>
                </div>
              </div>

              <Button asChild size="lg" className="w-full bg-holo-mint hover:bg-holo-mint-dark text-white py-5 text-base font-bold">
                <Link href="/signup">Start 30-Day Free Trial</Link>
              </Button>
              <p className="text-center text-xs text-[var(--text-muted)] mt-2">No charge until trial ends</p>
            </div>
          </motion.div>

          {/* Founder Tier Card */}
          <motion.div
            className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden border-2 border-amber-500 flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 rounded-b-xl">
              <span className="text-white font-bold flex items-center gap-1.5 text-xs">
                <Star className="w-3.5 h-3.5" />
                LIMITED TIME
              </span>
            </div>

            <div className="relative z-10 mt-3 flex flex-col flex-grow">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-amber-500 mb-1">Founder</h2>
                <p className="text-[var(--text-secondary)] text-sm">Lifetime Pro access, one payment</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <div className="text-4xl font-bold text-amber-500">£99</div>
                  <span className="text-[var(--text-secondary)] text-sm">one-time</span>
                </div>
                <p className="text-amber-500 font-medium text-sm">Save £1,100+ over 5 years</p>
              </div>

              <div className="space-y-3 mb-6 flex-grow">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">Lifetime Pro Access</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">No Monthly Fees Ever</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">Exclusive Founder Badge</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">Priority Support Forever</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">Early Access to Features</span>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] text-sm">Full Refund Guarantee</span>
                </div>
              </div>

              <Button asChild size="lg" className="w-full bg-amber-500 hover:bg-amber-600 text-white py-5 text-base font-bold">
                <Link href="/signup">Secure Founder Pricing</Link>
              </Button>
              <p className="text-center text-xs text-[var(--text-muted)] mt-2">Only available during Early Access</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-[var(--brand-primary)] text-center mb-8">
            Compare Plans
          </h2>
          
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/50 p-4 font-bold text-[var(--foreground)]">
              <div>Feature</div>
              <div className="text-center">Free</div>
              <div className="text-center text-holo-mint">Pro / Founder</div>
            </div>
            
            {featureComparison.map((item, index) => (
              <div 
                key={index} 
                className={`grid grid-cols-3 p-4 items-center ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
              >
                <div>
                  <span className="font-medium text-[var(--foreground)]">{item.feature}</span>
                  <p className="text-sm text-[var(--text-secondary)] hidden sm:block">{item.description}</p>
                </div>
                <div className="flex justify-center">
                  {item.free ? (
                    <Check className="w-5 h-5 text-holo-mint" />
                  ) : (
                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="flex justify-center">
                  {item.pro ? (
                    <Check className="w-5 h-5 text-holo-mint" />
                  ) : (
                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
