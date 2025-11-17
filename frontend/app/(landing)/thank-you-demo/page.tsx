'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, CheckCircle } from 'lucide-react';

export default function ThankYouDemoPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center section-background py-16">
      <motion.div 
        className="container max-w-3xl px-4 md:px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center space-y-6">
          <div className="inline-block bg-[var(--muted)] p-4 rounded-full mb-4">
            <CheckCircle className="w-14 h-14 text-[var(--success)]" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary-dark tracking-tight">
            Thank You for Requesting a Demo!
          </h1>
          
          <p className="text-xl text-secondary-dark max-w-2xl mx-auto">
            Your request has been received. One of our team members will reach out to you within 24 hours to schedule your personalized demo.
          </p>
          
          <div className="card-background rounded-2xl shadow-lg border border-[var(--border)] p-6 md:p-8 mt-10">
            <h2 className="text-2xl font-bold text-primary-dark mb-4">What happens next?</h2>
            
            <div className="grid gap-6 text-left">
              <div className="flex gap-4 items-start">
                <div className="bg-[var(--muted)] p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-[var(--success)]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary-dark">Demo Scheduling</h3>
                  <p className="text-secondary-dark">We&apos;ll email you with available time slots for your personalized demo</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="bg-[var(--muted)] p-3 rounded-lg">
                  <span className="flex h-6 w-6 items-center justify-center text-[var(--success)] font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary-dark">Personalized Demo</h3>
                  <p className="text-secondary-dark">See how Repruv can address your specific needs</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="bg-[var(--muted)] p-3 rounded-lg">
                  <span className="flex h-6 w-6 items-center justify-center text-[var(--success)] font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary-dark">Custom Proposal</h3>
                  <p className="text-secondary-dark">Receive a tailored solution and pricing plan designed for your requirements</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-white">
              <Link href="/">
                Return to Homepage
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-muted">
              <Link href="/features">
                Explore Features
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
