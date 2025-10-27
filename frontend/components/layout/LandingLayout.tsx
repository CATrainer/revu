// frontend/components/layout/LandingLayout.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { 
  FaReply,
  FaBrain,
  FaHashtag,
  FaChartBar,
  FaThLarge
} from "react-icons/fa";
import { Footer } from './Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { AccountDropdown } from './AccountDropdown';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { VideoModal } from '@/components/ui/VideoModal';
import { EarlyAccessBanner } from '@/components/landing/EarlyAccessBanner';
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
  const [videoModalOpen, setVideoModalOpen] = useState(false);
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
                      <ul className="grid gap-3 p-6 md:w-[600px] lg:w-[800px] grid-cols-4">
                        <li>
                          <NavigationMenuLink asChild>
                            <Link
                              className="flex h-full w-full select-none flex-col justify-center items-center rounded-md brand-background p-4 no-underline outline-none focus:shadow-md hover:bg-accent/50 transition-colors"
                              href="/features"
                            >
                              <div className="mb-2 flex items-center justify-center">
                                <FaThLarge className="text-blue-600 mb-2" size={24} />
                              </div>
                              <div className="text-base font-medium text-primary-dark text-center">
                                All Features
                              </div>
                              <p className="text-xs leading-tight text-secondary-dark text-center mt-1">
                                Discover how Repruv can power your community engagement
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <Link href="/features#comment-automation" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-center">
                              <div className="flex items-center justify-center mb-2">
                                <FaReply className="text-blue-500" size={20} />
                              </div>
                              <div className="text-sm font-medium leading-none">DM & Comment Automation</div>
                              <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                                Automate replies to DM&apos;s & Comments
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <Link href="/features#social-monitoring" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-center">
                              <div className="flex items-center justify-center mb-2">
                                <FaHashtag className="text-pink-500" size={20} />
                              </div>
                              <div className="text-sm font-medium leading-none">Social Monitoring</div>
                              <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                                Keep on top of what people are saying about you
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <Link href="/features#ai-responses" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-center">
                              <div className="flex items-center justify-center mb-2">
                                <FaBrain className="text-purple-500" size={20} />
                              </div>
                              <div className="text-sm font-medium leading-none">AI Creator Sidekick</div>
                              <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                                Your personalized AI chatbot
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <Link href="/features#analytics-and-reports" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-center">
                              <div className="flex items-center justify-center mb-2">
                                <FaChartBar className="text-holo-mint" size={20} />
                              </div>
                              <div className="text-sm font-medium leading-none">Analytics & Reports</div>
                              <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                                Actionable insights and metrics
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
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
                    <Button asChild className="bg-holo-mint hover:bg-holo-mint-dark text-gray-900 dark:text-white">
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
                    <Button asChild className="w-full min-h-11 bg-holo-mint hover:bg-holo-mint-dark text-gray-900 dark:text-white">
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