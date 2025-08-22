// frontend/app/(landing)/page.tsx
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { SocialProof } from '@/components/landing/SocialProof';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { ScrollNavigation } from '@/components/shared/ScrollNavigation';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <SocialProof />
      <FinalCTA />
      <ScrollNavigation />
    </>
  );
}