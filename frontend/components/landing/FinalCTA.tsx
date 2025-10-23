// frontend/components/landing/FinalCTA.tsx
'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Rocket, ArrowRight } from 'lucide-react';

export function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section 
      ref={ref}
      className="py-20 section-background relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-holo-purple/10 via-holo-teal/10 to-holo-mint/10"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-holo-mint/20 to-holo-purple/20 rounded-full blur-3xl"></div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Rocket className="w-16 h-16 text-holo-mint mx-auto mb-6" />
          
          <h2 className="text-4xl md:text-5xl font-bold text-primary-dark mb-6">
            Ready to Grow Your Channel?
          </h2>
          
          <p className="text-xl text-secondary-dark mb-8 max-w-2xl mx-auto">
            Join Early Access today and start increasing your revenue with AI-powered automation and intelligence. Completely free while we build together.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="bg-holo-mint hover:bg-holo-mint-dark text-gray-900 dark:text-white px-12 py-6 text-lg">
              <Link href="/signup" className="flex items-center gap-2">
                Join Early Access - Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-holo-mint text-holo-mint hover:bg-muted px-12 py-6 text-lg">
              <Link href="/features">
                Explore Features
              </Link>
            </Button>
          </div>

          <p className="text-sm text-secondary-dark mt-6">
            ✓ Unlimited features during Early Access • ✓ No credit card required • ✓ Cancel anytime
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}
