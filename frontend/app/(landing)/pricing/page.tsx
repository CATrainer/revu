import { Pricing } from '@/components/landing/Pricing';
import { Badge } from '@/components/ui/badge';

export default function PricingPage() {
  return (
  <div className="py-24 section-background">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <Badge className="mb-4 bg-[var(--brand-primary-solid)] hover:bg-[var(--brand-primary-solid-hover)] text-[var(--brand-primary-solid-foreground)] border-0">Launch Special</Badge>
    <h1 className="text-4xl md:text-5xl font-bold text-primary-dark mb-4">
          Simple, Transparent Pricing
        </h1>
    <p className="text-xl text-secondary-dark max-w-2xl mx-auto">
          Choose the plan that grows with your business. All plans include a 30-day free trial.
        </p>
      </section>

      {/* Special Offer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="card-background rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-primary-dark mb-2">
            🎉 Launch Special: Professional Tier for £100
          </h2>
          <p className="text-lg text-secondary-dark">
            Get the Professional plan for £100/month for your first 100 days (normally £179/month)
          </p>
        </div>
      </section>

      {/* Pricing Component */}
      <Pricing />

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
    <h2 className="text-3xl font-bold text-primary-dark mb-12 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-8">
          <div>
      <h3 className="text-xl font-semibold mb-2 text-primary-dark">Can I change plans anytime?</h3>
      <p className="text-secondary-dark">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle.
            </p>
          </div>
          <div>
      <h3 className="text-xl font-semibold mb-2 text-primary-dark">What happens after my free trial?</h3>
      <p className="text-secondary-dark">
              After your 30-day trial, you&apos;ll be automatically enrolled in your selected plan. You can cancel anytime before the trial ends.
            </p>
          </div>
          <div>
      <h3 className="text-xl font-semibold mb-2 text-primary-dark">Do you offer discounts for annual billing?</h3>
      <p className="text-secondary-dark">
              Yes! Pay annually and save 2 months (16% discount). Contact us for annual pricing options.
            </p>
          </div>
          <div>
      <h3 className="text-xl font-semibold mb-2 text-primary-dark">What&apos;s included in AI responses?</h3>
      <p className="text-secondary-dark">
              Each plan includes a set number of AI-generated responses per month. Unused responses don&apos;t roll over, but you can purchase additional responses as needed.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}