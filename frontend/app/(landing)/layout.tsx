// frontend/app/(landing)/layout.tsx
import { LandingLayout } from '@/components/layout/LandingLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LandingLayout>{children}</LandingLayout>;
}