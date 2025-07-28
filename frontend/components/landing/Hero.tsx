// frontend/components/landing/Hero.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Star, TrendingUp, MessageSquare } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative bg-gradient-to-b from-gray-50 to-white py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            All-in-One Dashboard to
            <br />
            <span className="text-indigo-600">Supercharge Your Business</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Manage reviews, monitor competitors, and grow your reputation with 
            AI-powered insights that save you hours every week
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/join-waitlist">Join Waiting List</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo">Request Demo</Link>
            </Button>
          </div>
        </div>
        
        {/* Dashboard Screenshot with floating elements */}
        <div className="mt-16 relative">
          <div className="relative mx-auto max-w-6xl">
            {/* Floating metric cards */}
            {/* Floating metric cards - add z-10 to each */}
            <div className="hidden lg:block absolute -left-4 top-20 bg-white rounded-lg shadow-lg p-4 animate-float z-10">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">4.8 Rating</span>
              </div>
            </div>

            <div className="hidden lg:block absolute -right-4 top-32 bg-white rounded-lg shadow-lg p-4 animate-float-delayed z-10">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="font-semibold">+23% Growth</span>
              </div>
            </div>

            <div className="hidden lg:block absolute left-8 -bottom-4 bg-white rounded-lg shadow-lg p-4 animate-float z-10">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                <span className="font-semibold">142 Reviews</span>
              </div>
            </div>

            {/* Main screenshot - keep it at default z-index or add relative */}
            <div className="relative rounded-lg shadow-2xl overflow-hidden transform transition-transform hover:scale-[1.01]">
              <Image
                src="/images/dashboard-screenshot.png"
                alt="Revu Dashboard showing review analytics"
                width={1200}
                height={675}
                className="w-full"
                priority
                quality={95}
              />
            </div>
            
            {/* Subtle gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -z-10 transform translate-x-1/2 -translate-y-1/2">
        <div className="w-96 h-96 bg-indigo-100 rounded-full opacity-20 blur-3xl"></div>
      </div>
    </section>
  );
}