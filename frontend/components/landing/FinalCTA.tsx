// frontend/components/landing/FinalCTA.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function FinalCTA() {
  return (
    <section className="py-24 bg-gradient-to-r from-[hsl(263,70%,68%)] to-[hsl(280,65%,60%)] dark:from-[hsl(263,70%,50%)] dark:to-[hsl(280,65%,45%)]">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Transform Your Review Management?
        </h2>
        <p className="text-xl text-white/90 mb-8">
          Join hundreds of businesses saving time and growing their reputation with Revu
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-white text-[hsl(263,70%,68%)] hover:bg-gray-100 hover:text-[hsl(263,70%,60%)] border-0" asChild>
            <Link href="/join-waitlist">Join Waiting List</Link>
          </Button>
          <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-[hsl(263,70%,68%)]" asChild>
            <Link href="/demo">Schedule a Demo</Link>
          </Button>
        </div>
        <p className="mt-4 text-indigo-100">
          Get early access • Join the waiting list • Be first to know
        </p>
      </div>
    </section>
  );
}