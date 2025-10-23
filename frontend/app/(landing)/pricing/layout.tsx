import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing - Free Early Access & Founder Pricing | Repruv',
  description: 'Free unlimited access during Early Access. Lock in lifetime Founder Pricing. Plans for creators and agencies starting Q2 2025.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
