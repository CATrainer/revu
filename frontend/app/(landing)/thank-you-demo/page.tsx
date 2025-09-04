'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, CheckCircle } from 'lucide-react';

export default function ThankYouDemoPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-gradient-to-b from-white to-gray-100 dark:from-gray-950 dark:to-gray-900 py-16">
      <motion.div 
        className="container max-w-3xl px-4 md:px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center space-y-6">
          <div className="inline-block bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
            <CheckCircle className="w-14 h-14 text-green-600 dark:text-green-400" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-green-600 dark:text-green-500 tracking-tight">
            Thank You for Requesting a Demo!
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Your request has been received. One of our team members will reach out to you within 24 hours to schedule your personalized demo.
          </p>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 md:p-8 mt-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">What happens next?</h2>
            
            <div className="grid gap-6 text-left">
              <div className="flex gap-4 items-start">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Demo Scheduling</h3>
                  <p className="text-gray-600 dark:text-gray-400">We&apos;ll email you with available time slots for your personalized demo</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                  <span className="flex h-6 w-6 items-center justify-center text-green-600 dark:text-green-400 font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personalized Demo</h3>
                  <p className="text-gray-600 dark:text-gray-400">See how Repruv can address your specific needs</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                  <span className="flex h-6 w-6 items-center justify-center text-green-600 dark:text-green-400 font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Custom Proposal</h3>
                  <p className="text-gray-600 dark:text-gray-400">Receive a tailored solution and pricing plan designed for your requirements</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
              <Link href="/">
                Return to Homepage
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700">
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
