// frontend/components/layout/LandingLayout.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Footer } from './Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { AccountDropdown } from './AccountDropdown';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

export function LandingLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const router = useRouter();

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
                    {/* Make trigger navigate on click; dropdown still opens on hover/keyboard */}
                    <NavigationMenuTrigger
                      onPointerDown={(e) => {
                        // Only handle primary button without modifier keys
                        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                          e.preventDefault();
                          router.push('/features');
                        }
                      }}
                      aria-label="Open features menu or click to go to Features"
                    >
                      Features
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                        <li className="row-span-3">
                          <NavigationMenuLink asChild>
                            <Link
                              className="flex h-full w-full select-none flex-col justify-end rounded-md brand-background p-6 no-underline outline-none focus:shadow-md"
                              href="/features"
                            >
                              <div className="mb-2 mt-4 text-lg font-medium text-primary-dark">
                                All Features
                              </div>
                              <p className="text-sm leading-tight text-secondary-dark">
                                Discover how Repruv can transform your review management
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <Link href="/features#review-management" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">Review Management</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                Centralize all your reviews in one place
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <Link href="/features#ai-responses" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">AI Responses</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                Generate personalized responses instantly
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <Link href="/features#competitor-tracking" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">Competitor Tracking</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                Stay ahead of your competition
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/ai" className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                        SEO | AI
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/pricing" className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                        Pricing
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                      <Link href="/demo">
                        Request Demo
                      </Link>
                    </Button>
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
                    <Button asChild>
                      <Link href="/signup">Sign Up</Link>
                    </Button>
                  </>
                )
              )}
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-secondary-dark hover:text-primary-dark hover-background focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--ring)]"
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
          <div className="md:hidden nav-mobile-background">
            <div className="pt-2 pb-3 space-y-1">
              <Link
                href="/features"
                className="nav-mobile-link"
              >
                Features
              </Link>
              <Link
                href="/ai"
                className="nav-mobile-link"
              >
                SEO | AI
              </Link>
              <Link
                href="/pricing"
                className="nav-mobile-link"
              >
                Pricing
              </Link>
              <div className="px-3 py-2">
                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <Link href="/demo">
                    Request Demo
                  </Link>
                </Button>
              </div>
            </div>
            <div className="pt-4 pb-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-center px-4 mb-3">
                <ThemeToggle />
              </div>
              <div className="flex items-center px-4 space-x-3">
                {!isLoading && (
                  isAuthenticated ? (
                    <div className="w-full flex justify-center">
                      <AccountDropdown variant="landing" />
                    </div>
                  ) : (
                    <>
                      <Button variant="ghost" className="w-full" asChild>
                        <Link href="/login">Login</Link>
                      </Button>
                      <Button className="w-full" asChild>
                        <Link href="/signup">Sign Up</Link>
                      </Button>
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* Main Content */}
      <main className="flex-grow">{children}</main>
      
      {/* Footer */}
      <div className="border-t border-[var(--border)]">
        <Footer />
      </div>
    </div>
  );
}