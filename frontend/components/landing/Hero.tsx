// frontend/components/landing/Hero.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative bg-gradient-to-b from-gray-50 to-white py-24">
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
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo">Request Demo</Link>
            </Button>
          </div>
        </div>
        
        {/* Hero Graphic Placeholder */}
        <div className="mt-16 relative">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-2xl h-96 flex items-center justify-center">
            <p className="text-white text-2xl font-semibold">[Dashboard Preview]</p>
          </div>
        </div>
      </div>
    </section>
  );
}