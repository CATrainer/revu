// frontend/components/landing/FinalCTA.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function FinalCTA() {
  return (
    <motion.section 
      id="demo-cta" 
      className="py-24 section-background-alt"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <motion.h2 
            className="text-2xl md:text-3xl font-bold brand-text mb-4 font-['Poppins',sans-serif]"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Ready to See How It Works?
          </motion.h2>
          <motion.p 
            className="text-lg text-primary-dark max-w-3xl mx-auto font-['Poppins',sans-serif] font-bold"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Book a personalized demo and see how creators are transforming their social media engagement with Repruv
          </motion.p>
        </motion.div>

        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <motion.div 
            initial={{ opacity: 0, x: 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-lg w-full"
          >
            <motion.div
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-full"
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-primary-dark font-['Poppins',sans-serif]">
                    Book a Personalized Demo
                  </CardTitle>
                  <CardDescription className="text-primary-dark mt-2 font-['Poppins',sans-serif] font-bold text-lg">
                    See how Repruv can transform your creator workflow with AI-powered responses and social media insights.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 text-center space-y-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button className="button-primary w-full text-lg py-6" asChild>
                      <Link href="/demo">Schedule Your Demo</Link>
                    </Button>
                  </motion.div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-[var(--border)]">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🎯</div>
                      <p className="text-sm font-medium text-primary-dark">Personalized</p>
                      <p className="text-xs text-secondary-dark">Tailored to your content</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-2">⚡</div>
                      <p className="text-sm font-medium text-primary-dark">Live Features</p>
                      <p className="text-xs text-secondary-dark">See AI responses in action</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-2">💬</div>
                      <p className="text-sm font-medium text-primary-dark">Ask Questions</p>
                      <p className="text-xs text-secondary-dark">Get all your answers</p>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <p className="text-sm text-secondary-dark font-['Poppins',sans-serif]">
                      Already joined the waitlist? <Link href="/#hero" className="text-[var(--brand-primary-solid)] hover:underline font-medium">Get early access here</Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
