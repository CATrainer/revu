// frontend/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BarChart3, Inbox, Users, ChartPie, Settings, ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

const baseNav = [
  { name: 'Home', href: '/dashboard', icon: BarChart3 },
  { name: 'Comments', href: '/comments', icon: Inbox },
  { name: 'Automation', href: '/automation', icon: Bot },
  { name: 'Socials', href: '/socials', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: ChartPie },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navigation = useMemo(() => baseNav, []);

  return (
  <aside
      className={cn(
    'dashboard-card soft-shadow border-r pt-5 pb-4 overflow-y-auto scrollbar-nice transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between px-4 mb-8">

        <Link
          href="/"
          aria-label="Repruv home"
          className="flex items-center justify-center w-full"
        >
          {collapsed ? (
            <Image
              src="/logo/mark.png"
              alt="Repruv"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
          ) : (
            <>
              <Image
                src="/logo/text_light.png"
                alt="Repruv"
                width={140}
                height={36}
                className="h-9 w-auto dark:hidden"
                priority
              />
              <Image
                src="/logo/text_dark.png"
                alt="Repruv"
                width={140}
                height={36}
                className="h-9 w-auto hidden dark:inline"
                priority
              />
            </>
          )}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover-background ml-2 flex-shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-secondary-dark" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-secondary-dark" />
          )}
        </button>
      </div>

      <nav className="mt-5 px-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'brand-background brand-text'
                    : 'nav-link hover-background'
                )}
              >
                <item.icon
                  className={cn(
                    'flex-shrink-0 h-5 w-5 transition-colors',
                    collapsed ? 'mr-0' : 'mr-3',
                    isActive
                      ? 'brand-text'
                      : 'text-secondary-dark group-hover:text-primary-dark'
                  )}
                />
                {!collapsed && item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}