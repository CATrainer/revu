import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Tools for Revenue Growth | Repruv Features',
  description: 'Discover how Repruv helps creators monetize better: AI automation, revenue intelligence, and growth analytics for YouTube, Instagram, and TikTok. Now in Early Access Beta.',
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
