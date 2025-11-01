// frontend/app/(landing)/page.tsx
import type { Metadata } from 'next';
import { Hero } from '@/components/landing/Hero';
import { PlatformSupport } from '@/components/landing/PlatformSupport';
import { Features } from '@/components/landing/Features';
import { WhyEarlyAccess } from '@/components/landing/WhyEarlyAccess';

export const metadata: Metadata = {
  title: 'Repruv - AI-Powered Creator Growth Platform | Early Access',
  description: 'Join Repruv\'s Early Access - AI-powered platform helping creators grow channels and increase revenue through automation, monetization insights, and cross-platform intelligence.',
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <PlatformSupport />
      <Features />
      <WhyEarlyAccess />
    </>
  );
}