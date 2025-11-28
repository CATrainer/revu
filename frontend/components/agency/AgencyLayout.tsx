'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import {
  Building2,
  Users,
  Briefcase,
  Settings,
  LogOut,
  LayoutDashboard,
  UserPlus,
  ChevronDown,
  Bell,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AgencyLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/agency', icon: LayoutDashboard },
  { name: 'Creators', href: '/agency/creators', icon: Users },
  { name: 'Opportunities', href: '/agency/opportunities', icon: Briefcase },
  { name: 'Team', href: '/agency/team', icon: UserPlus },
  { name: 'Settings', href: '/agency/settings', icon: Settings },
];

export function AgencyLayout({ children }: AgencyLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActiveRoute = (href: string) => {
    if (href === '/agency') {
      return pathname === '/agency';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen section-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo & Agency Badge */}
          <div className="flex items-center gap-4">
            <Link href="/agency" className="flex items-center gap-2">
              <Image
                src="/logo/text_light.png"
                alt="Repruv"
                width={120}
                height={32}
                className="h-8 w-auto dark:hidden"
                priority
              />
              <Image
                src="/logo/text_dark.png"
                alt="Repruv"
                width={120}
                height={32}
                className="h-8 w-auto hidden dark:block"
                priority
              />
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
              <Building2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Agency
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
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

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {/* Notification badge - can be made dynamic */}
              {/* <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                3
              </span> */}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-medium text-sm">
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.full_name || 'Agency User'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/agency/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-600 dark:text-red-400 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="h-full grid grid-cols-5">
          {navigation.map((item) => {
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

      {/* Main content */}
      <main className="pt-16 pb-16 md:pb-0 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
