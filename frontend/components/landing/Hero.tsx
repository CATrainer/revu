// frontend/components/landing/Hero.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DashboardPreview } from '@/components/landing/DashboardPreview';

export function Hero() {
  return (
    <section className="relative section-background-alt py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-dark mb-6">
            All-in-One Dashboard to
            <br />
            <span className="brand-text">Supercharge Your Business</span>
          </h1>
          <p className="text-lg md:text-xl text-secondary-dark mb-8 max-w-3xl mx-auto">
            Manage reviews, monitor competitors, and grow your reputation with 
            AI-powered insights that save you hours every week
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="button-primary" asChild>
              <Link href="/join-waitlist">Join Waiting List</Link>
            </Button>
            <Button size="lg" className="button-secondary" asChild>
              <Link href="/demo">Request Demo</Link>
            </Button>
          </div>
        </div>
        
        {/* Static dashboard preview */}
        <div className="mt-16 relative">
          <div className="relative mx-auto max-w-6xl">
            <div className="relative rounded-lg shadow-2xl overflow-hidden transform transition-transform hover:scale-[1.01]">
              <DashboardPreview />
            </div>
            
            {/* Subtle gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white dark:from-[hsl(222,84%,5%)] via-white/20 dark:via-[hsl(222,84%,5%)]/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -z-10 transform translate-x-1/2 -translate-y-1/2">
        <div className="w-96 h-96 brand-background rounded-full opacity-20 blur-3xl"></div>
      </div>
    </section>
  );
}