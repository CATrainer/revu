// frontend/app/(landing)/page.tsx
import { Hero } from '@/components/landing/Hero';
import { PlatformSupport } from '@/components/landing/PlatformSupport';
import { Features } from '@/components/landing/Features';
import { SocialProof } from '@/components/landing/SocialProof';
import { WhyEarlyAccess } from '@/components/landing/WhyEarlyAccess';
import { FinalCTA } from '@/components/landing/FinalCTA';

export default function HomePage() {
  return (
    <>
      <Hero />
      <PlatformSupport />
      <Features />
      <SocialProof />
      <WhyEarlyAccess />
      <FinalCTA />
    </>
  );
}