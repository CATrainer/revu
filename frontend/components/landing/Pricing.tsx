// frontend/components/landing/Pricing.tsx
'use client';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';

const plans = [
  {
    name: 'Essentials',
    price: '£79',
    description: 'Perfect for single-location businesses',
    features: [
      '1 location',
      'Google Reviews integration',
      '500 AI responses/month',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: '£179',
    description: 'Ideal for growing businesses',
    features: [
      'Up to 3 locations',
      'Google + Social monitoring',
      '2,000 AI responses/month',
      'Advanced analytics',
      'Competitor tracking',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: '£399',
    description: 'For multi-location operations',
    features: [
      '5 locations included',
      'All platform integrations',
      'Unlimited AI responses',
      'Custom AI training',
      'API access',
      'Dedicated account manager',
    ],
  },
];

export function Pricing() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-100px" });

  return (
    <section className="py-24 bg-gray-50 dark:bg-[hsl(222,84%,7%)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 dark:text-[hsl(215,20%,65%)]">
            Choose the plan that grows with your business
          </p>
        </motion.div>
        
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 80, scale: 0.9 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 80, scale: 0.9 }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.2,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              whileHover={{ 
                y: -10,
                scale: 1.02,
                transition: { duration: 0.3 }
              }}
            >
              <Card className="h-full dark:bg-[hsl(222,84%,7%)] dark:border-[hsl(222,47%,16%)] bg-white border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="dark:text-white text-gray-900">{plan.name}</CardTitle>
                  <CardDescription className="dark:text-[hsl(215,20%,65%)] text-gray-600">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold dark:text-white text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 dark:text-[hsl(215,20%,65%)]">/month</span>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li 
                        key={featureIndex} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                        transition={{ 
                          duration: 0.5, 
                          delay: index * 0.2 + featureIndex * 0.1 + 0.3
                        }}
                        className="flex items-start"
                      >
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-[hsl(215,20%,75%)]">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-[hsl(263,70%,68%)] hover:bg-[hsl(263,70%,60%)] text-white border-0" asChild>
                    <Link href="/join-waitlist">Join Waiting List</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 dark:text-[hsl(215,20%,65%)]">
            Join our waiting list to be first to access these plans when we launch.
          </p>
        </motion.div>
      </div>
    </section>
  );
}