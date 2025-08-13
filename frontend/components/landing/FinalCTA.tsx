// frontend/components/landing/FinalCTA.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function FinalCTA() {
  return (
    <section className="py-24 section-background-alt">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-4">
          Ready to Transform Your Review Management?
        </h2>
        <p className="text-xl text-secondary-dark mb-8">
          Join hundreds of businesses saving time and growing their reputation with Repruv
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="button-primary" asChild>
            <Link href="/join-waitlist">Get Early Access</Link>
          </Button>
          <Button size="lg" className="button-secondary" asChild>
            <Link href="/demo">Book a Demo</Link>
          </Button>
        </div>
        <p className="mt-4 text-secondary-dark">
          Get early access • Join the waiting list • Be first to know
        </p>
      </div>
    </section>
  );
}