// frontend/components/layout/LandingLayout.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Footer } from './Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { AccountDropdown } from './AccountDropdown';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { VideoModal } from '@/components/ui/VideoModal';
import { EarlyAccessBanner } from '@/components/landing/EarlyAccessBanner';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';

export function LandingLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const { isAuthenticated, isLoading, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="nav-background shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2" aria-label="Repruv home">
                <Image
                  src="/logo/text_light.png"
                  alt="Repruv"
                  width={120}
                  height={32}
                  priority
                  className="h-8 w-auto dark:hidden"
                />
                <Image
                  src="/logo/text_dark.png"
                  alt="Repruv"
                  width={120}
                  height={32}
                  priority
                  className="h-8 w-auto hidden dark:inline"
                />
              </Link>
            </div>
              
            {/* Centered Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:justify-center md:flex-1">
              <NavigationMenu>
                <NavigationMenuList className="flex items-center space-x-8">
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/features" className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                        Features
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/pricing" className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                        Our Pricing
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/agency-partners" className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                        Agency Partners
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
            
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              <ThemeToggle />
              {!isLoading && (
                isAuthenticated ? (
                  <AccountDropdown variant="landing" />
                ) : (
                  <>
                    <Button variant="ghost" asChild>
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild className="bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-white">
                      <Link href="/signup">Join Early Access</Link>
                    </Button>
                  </>
                )
              )}
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-controls="mobile-menu"
                aria-expanded={mobileMenuOpen}
                className="inline-flex items-center justify-center h-10 w-10 rounded-md text-secondary-dark hover:text-primary-dark hover-background focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--ring)]"
              >
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            role="menu"
            aria-label="Mobile navigation"
            className="md:hidden nav-mobile-background origin-top animate-in slide-in-from-top-2 fade-in duration-200"
          >
            <div className="pt-2 pb-3 space-y-1">
              <Link
                href="/features"
                role="menuitem"
                className="nav-mobile-link block px-4 py-3 text-base"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                role="menuitem"
                className="nav-mobile-link block px-4 py-3 text-base"
              >
                Pricing
              </Link>
              <Link
                href="/agency-partners"
                role="menuitem"
                className="nav-mobile-link block px-4 py-3 text-base"
              >
                Agency Partners
              </Link>
              <div className="px-3 py-2 space-y-2">
                {!isLoading && !isAuthenticated && (
                  <>
                    <Button asChild variant="outline" className="w-full min-h-11">
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild className="w-full min-h-11 bg-[var(--success)] hover:bg-emerald-600 text-gray-900 dark:text-white">
                      <Link href="/signup">Join Early Access</Link>
                    </Button>
                  </>
                )}
                {!isLoading && isAuthenticated && (
                  <Button asChild className="w-full min-h-11 bg-holo-mint hover:bg-holo-mint-dark text-white">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="pt-4 pb-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-center px-4 mb-3">
                <ThemeToggle />
              </div>
              {!isLoading && isAuthenticated && (
                <div className="flex items-center px-4">
                  <div className="w-full flex justify-center">
                    <AccountDropdown variant="landing" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
      
      {/* Early Access Banner - below nav */}
      <EarlyAccessBanner />
      
      {/* Main Content */}
      <main className="flex-grow">{children}</main>
      
      {/* Footer */}
      <div className="border-t border-[var(--border)]">
        <Footer />
      </div>
      
      {/* Video Modal */}
      <VideoModal 
        videoId="Vzg3Ltsmmw4"
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        isShort={false}
      />
    </div>
  );
}