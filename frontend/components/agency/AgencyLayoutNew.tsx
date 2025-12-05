'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import {
  Building2,
  LayoutDashboard,
  GitBranch,
  Megaphone,
  Users,
  FileText,
  DollarSign,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  Search,
  Plus,
  HelpCircle,
  Command,
  Keyboard,
  BookOpen,
  Video,
  MessageSquare,
  Sparkles,
  FileCheck,
  UserPlus,
  Receipt,
  BarChart3,
  Menu,
  X,
  Bot,
  ListTodo,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationsDropdown } from './NotificationsDropdown';

interface AgencyLayoutNewProps {
  children: React.ReactNode;
}

// Main navigation items
const mainNavigation = [
  { name: 'Dashboard', href: '/agency', icon: LayoutDashboard },
  { name: 'Pipeline', href: '/agency/pipeline', icon: GitBranch },
  { name: 'Campaigns', href: '/agency/campaigns', icon: Megaphone },
  { name: 'Creators', href: '/agency/creators', icon: Users },
  { name: 'Tasks', href: '/agency/tasks', icon: ListTodo },
  { name: 'Finance', href: '/agency/finance', icon: DollarSign },
  { name: 'Reports', href: '/agency/reports', icon: FileText },
  { name: 'Assistant', href: '/agency/assistant', icon: Bot },
];

// Secondary navigation by route
const secondaryNavigation: Record<string, { name: string; href: string }[]> = {
  '/agency/creators': [
    { name: 'Directory', href: '/agency/creators' },
    { name: 'Availability', href: '/agency/creators/availability' },
    { name: 'Performance', href: '/agency/creators/performance' },
    { name: 'Groups', href: '/agency/creators/groups' },
  ],
  '/agency/finance': [
    { name: 'Overview', href: '/agency/finance' },
    { name: 'Invoices', href: '/agency/finance/invoices' },
    { name: 'Payouts', href: '/agency/finance/payouts' },
    { name: 'Analytics', href: '/agency/finance/analytics' },
  ],
  '/agency/pipeline': [
    { name: 'Board', href: '/agency/pipeline' },
    { name: 'List', href: '/agency/pipeline/list' },
    { name: 'Analytics', href: '/agency/pipeline/analytics' },
  ],
  '/agency/campaigns': [
    { name: 'Active', href: '/agency/campaigns' },
    { name: 'Timeline', href: '/agency/campaigns/timeline' },
    { name: 'Templates', href: '/agency/campaigns/templates' },
  ],
};

// Quick action items
const quickActions = [
  { name: 'New Deal', description: 'Create a new pipeline deal', icon: Plus, href: '/agency/pipeline/new', shortcut: 'N' },
  { name: 'New Campaign', description: 'Start a new campaign', icon: Megaphone, href: '/agency/campaigns/new' },
  { name: 'Add Creator', description: 'Add a creator to your roster', icon: UserPlus, href: '/agency/creators/new' },
  { name: 'Create Invoice', description: 'Generate a new invoice', icon: Receipt, href: '/agency/finance/invoices/new' },
  { name: 'Generate Report', description: 'Create a performance report', icon: BarChart3, href: '/agency/reports/new' },
];

// Help menu items
const helpMenuItems = [
  { name: 'Documentation', icon: BookOpen, href: '/docs' },
  { name: 'Video Tutorials', icon: Video, href: '/tutorials' },
  { name: 'Keyboard Shortcuts', icon: Keyboard, action: 'shortcuts' },
  { name: 'Contact Support', icon: MessageSquare, href: '/support' },
  { name: "What's New", icon: Sparkles, href: '/changelog' },
];

export function AgencyLayoutNew({ children }: AgencyLayoutNewProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Cmd/Ctrl + N for new deal
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !isSearchOpen) {
        e.preventDefault();
        window.location.href = '/agency/pipeline/new';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const isActiveRoute = useCallback((href: string) => {
    if (href === '/agency') {
      return pathname === '/agency';
    }
    return pathname.startsWith(href);
  }, [pathname]);

  // Get secondary nav for current route
  const getSecondaryNav = useCallback(() => {
    for (const [route, items] of Object.entries(secondaryNavigation)) {
      if (pathname.startsWith(route)) {
        return items;
      }
    }
    return null;
  }, [pathname]);

  const secondaryNav = getSecondaryNav();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Primary Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          {/* Left Section - Logo & Workspace */}
          <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Logo */}
            <Link href="/agency" className="flex items-center gap-2 flex-shrink-0">
              <Image
                src="/logo/text_light.png"
                alt="Repruv"
                width={100}
                height={28}
                className="h-7 w-auto dark:hidden"
                priority
              />
              <Image
                src="/logo/text_dark.png"
                alt="Repruv"
                width={100}
                height={28}
                className="h-7 w-auto hidden dark:block"
                priority
              />
            </Link>

            {/* Workspace Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 max-w-[200px]">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <Building2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-medium text-sm truncate">{user?.full_name?.split(' ')[0] || 'Agency'}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <Building2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span>Main Workspace</span>
                  </div>
                  <Badge variant="secondary" className="ml-auto text-xs">Current</Badge>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Main Navigation - Desktop */}
            <nav className="hidden lg:flex items-center gap-1 ml-4">
              {mainNavigation.map((item) => {
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search campaigns, creators, brands...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-400">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile search */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Quick Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {quickActions.map((action) => (
                  <DropdownMenuItem key={action.name} asChild>
                    <Link href={action.href} className="flex items-start gap-3 py-2">
                      <action.icon className="h-5 w-5 mt-0.5 text-gray-500" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{action.name}</span>
                          {action.shortcut && (
                            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-400">
                              {action.shortcut}
                            </kbd>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <NotificationsDropdown />

            {/* Help Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {helpMenuItems.map((item) => (
                  <DropdownMenuItem key={item.name} asChild={item.href ? true : false}>
                    {item.href ? (
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.name}
                      </Link>
                    ) : (
                      <button className="flex items-center w-full">
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.name}
                      </button>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-medium text-sm">
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.full_name || 'Agency User'}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 hidden lg:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Admin
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/agency/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Agency Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/agency/team">
                      <Users className="mr-2 h-4 w-4" />
                      Team Members
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/agency/settings/billing">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/agency/settings/integrations">
                      <FileCheck className="mr-2 h-4 w-4" />
                      Integrations
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-600 dark:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Secondary Navigation */}
      {secondaryNav && (
        <div className="fixed top-16 left-0 right-0 z-40 h-12 border-b border-gray-200 dark:border-gray-800 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-md">
          <div className="h-full px-4 lg:px-6 flex items-center">
            <nav className="flex items-center gap-1">
              {secondaryNav.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== secondaryNav[0].href && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white dark:bg-gray-800 text-green-700 dark:text-green-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50'
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed top-16 left-0 bottom-0 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
            <nav className="p-4 space-y-2">
              {mainNavigation.map((item) => {
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                <Link
                  href="/agency/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
                <Link
                  href="/agency/team"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Users className="h-5 w-5" />
                  Team
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="h-full grid grid-cols-5">
          {mainNavigation.slice(0, 5).map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate max-w-[60px]">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className={cn(
        'pt-16 pb-16 lg:pb-0 min-h-screen',
        secondaryNav && 'pt-28'
      )}>
        <div className="px-4 lg:px-6 py-6">
          {children}
        </div>
      </main>

      {/* Global Search Modal */}
      <GlobalSearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
}
