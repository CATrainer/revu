'use client';

import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'Pricing - Free Early Access & Founder Pricing | Repruv',
  description: 'Free unlimited access during Early Access. Lock in lifetime Founder Pricing at 50% off. Plans for creators and agencies starting Q2 2025.',
};

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
          <h1 className="text-4xl md:text-5xl font-bold text-primary-dark mb-4">
            Pricing That Grows With Your Revenue
          </h1>
          <p className="text-xl text-secondary-dark mb-2">
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
              <h2 className="text-3xl md:text-4xl font-bold text-primary-dark">Early Access - Unlimited Free Access</h2>
            </div>
            
            <p className="text-xl text-center text-secondary-dark mb-8 max-w-3xl mx-auto">
              During Early Access, <strong className="text-holo-mint">all users get unlimited access to all available features</strong> completely free. This is your chance to grow your channel and increase revenue while helping us refine the platform.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-3">
                <h3 className="font-bold text-lg text-primary-dark mb-4">What's Included (Free During Early Access):</h3>
                {[
                  'Unlimited AI responses across all your content',
                  'YouTube & Instagram automation',
                  'AI Creator Assistant with revenue insights',
                  'Full analytics and opportunity identification',
                  'Priority feature requests and direct feedback channel',
                  'First access to new platforms and features'
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                    <span className="text-secondary-dark">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold text-holo-mint mb-4">FREE</div>
                  <p className="text-lg text-secondary-dark mb-6">Unlimited everything during Early Access</p>
                  <Button asChild size="lg" className="bg-holo-mint hover:bg-holo-mint-dark text-white px-12 py-6 text-lg">
                    <Link href="/signup">
                      Join Early Access - Free
                    </Link>
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
              LIMITED TIME OFFER
            </span>
          </div>

          <div className="relative z-10 mt-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Lock className="w-8 h-8 text-holo-mint" />
              <h2 className="text-3xl md:text-4xl font-bold text-primary-dark">Lock In Founder Pricing</h2>
            </div>
            
            <p className="text-xl text-center text-secondary-dark mb-8">
              Support our development and secure exclusive lifetime pricing before launch.
            </p>

            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className="text-5xl md:text-6xl font-bold text-holo-mint mb-2">£99</div>
                <p className="text-lg text-secondary-dark">One-time payment • Lifetime access</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-primary-dark">Pay once, benefit forever:</h3>
                  {[
                    'Lifetime Pro Tier Access',
                    '50% Off Forever (Pro will be £19.99/month)',
                    'Save over £140 in year one alone',
                    'Exclusive Founder Badge',
                    'Priority Support forever',
                    'Feature Request Priority',
                    'Early Access to Everything'
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                      <span className="text-secondary-dark"><strong>{benefit.split(' -')[0]}</strong>{benefit.includes(' -') ? ' -' + benefit.split(' -')[1] : ''}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-muted rounded-2xl p-6">
                  <h3 className="font-bold text-lg text-primary-dark mb-4">Future Value:</h3>
                  <p className="text-secondary-dark mb-4">
                    Pro tier launches at £19.99/month. As a Founder, you never pay monthly fees for Pro features.
                  </p>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-secondary-dark">Year 1 savings:</span>
                      <span className="font-bold text-holo-mint">£140+</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-secondary-dark">Year 2 savings:</span>
                      <span className="font-bold text-holo-mint">£240</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary-dark">Total (5 years):</span>
                      <span className="font-bold text-holo-mint text-lg">£1,100+</span>
                    </div>
                  </div>
                  <p className="text-sm text-secondary-dark italic">
                    <strong>Why offer this?</strong> Your early support funds development. You get incredible value, we get to build faster.
                  </p>
                </div>
              </div>

              <div className="text-center">
                <Button asChild size="lg" className="bg-holo-mint hover:bg-holo-mint-dark text-white px-12 py-6 text-lg mb-4">
                  <Link href="/signup">
                    Secure Founder Pricing - £99
                  </Link>
                </Button>
                <p className="text-sm text-secondary-dark">
                  Save £140+ in Year 1 • Full refund guarantee if we shut down
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Planned Launch Pricing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-4">
            Planned Launch Pricing (Q2 2025)
          </h2>
          <p className="text-lg text-secondary-dark">
            These prices go live when we officially launch. Lock in Founder Pricing now to save up to 50%.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <motion.div
            className="glass-panel rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-bold text-primary-dark mb-2">Free Plan</h3>
            <div className="text-4xl font-bold text-primary-dark mb-6">£0<span className="text-lg text-secondary-dark">/month</span></div>
            <p className="text-secondary-dark mb-6">Perfect for trying Repruv</p>
            
            <div className="space-y-3 mb-8">
              {[
                { included: true, text: 'Up to 2 platform connections' },
                { included: true, text: '500 AI responses per month' },
                { included: true, text: 'Basic analytics and insights' },
                { included: true, text: 'Community support' },
                { included: true, text: 'Revenue tracking dashboard' },
                { included: false, text: 'Priority support' },
                { included: false, text: 'Advanced automation' }
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  {feature.included ? (
                    <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={feature.included ? 'text-secondary-dark' : 'text-gray-400'}>{feature.text}</span>
                </div>
              ))}
            </div>

            <p className="text-sm text-secondary-dark mb-4 italic">
              Ideal for new creators just starting to monetize
            </p>

            <Button asChild variant="outline" className="w-full">
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
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-holo-mint text-white px-4 py-1 rounded-full text-sm font-bold">
              MOST POPULAR
            </div>
            
            <h3 className="text-2xl font-bold text-primary-dark mb-2">Pro Plan</h3>
            <div className="text-4xl font-bold text-holo-mint mb-2">£19.99<span className="text-lg text-secondary-dark">/month</span></div>
            <p className="text-sm text-secondary-dark mb-6">Annual: £199/year (save 17%)</p>
            <p className="text-secondary-dark mb-6">For creators serious about growth</p>
            
            <div className="space-y-3 mb-8">
              {[
                'Unlimited platform connections',
                'Unlimited AI responses',
                'Advanced revenue intelligence',
                'Opportunity alerts',
                'Priority support',
                'Custom automation workflows',
                'Sentiment analysis',
                'Predictive analytics'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                  <span className="text-secondary-dark">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-sm text-secondary-dark">
                <strong className="text-primary-dark">ROI Example:</strong> If Repruv helps you close just ONE extra brand deal worth £500/year, your investment pays for itself 25x over.
              </p>
            </div>

            <Button asChild className="w-full bg-holo-mint hover:bg-holo-mint-dark text-white">
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
            <h3 className="text-2xl font-bold text-primary-dark mb-2">Agency Plan</h3>
            <div className="text-4xl font-bold text-primary-dark mb-6">Custom</div>
            <p className="text-secondary-dark mb-6">For agencies managing multiple creators</p>
            
            <div className="space-y-3 mb-8">
              {[
                'Everything in Pro, plus:',
                'Multi-creator dashboard',
                'Team collaboration tools',
                'Client reporting (white-label)',
                'Dedicated account manager',
                'Custom integrations & API',
                'SLA guarantees',
                'Bulk creator onboarding'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  {index === 0 ? (
                    <Star className="w-5 h-5 text-holo-purple flex-shrink-0 mt-0.5" />
                  ) : (
                    <Check className="w-5 h-5 text-holo-mint flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-secondary-dark font-semibold">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-sm text-secondary-dark mb-2">
                <strong className="text-primary-dark">Pricing Structure:</strong>
              </p>
              <ul className="text-sm text-secondary-dark space-y-1">
                <li>• £250/month base fee</li>
                <li>• £35/month per creator</li>
                <li>• Early Access Partners: 30-40% off forever</li>
              </ul>
            </div>

            <Button asChild variant="outline" className="w-full border-2 border-holo-mint text-holo-mint hover:bg-muted">
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
