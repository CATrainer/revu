import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agency Partner Program - Build With Us | Repruv',
  description: 'Partner with Repruv to help your creators grow channels and increase revenue. Free during beta, preferential pricing at launch. Limited spots available.',
};

export default function AgencyPartnersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
