// frontend/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BarChart3, Inbox, Brain, Users, TrendingUp, ChartPie, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';

const baseNav = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Engagement Hub', href: '/engagement', icon: Inbox },
  { name: 'Pulse Monitor', href: '/pulse', icon: TrendingUp },
  { name: 'Competitors', href: '/competitors', icon: Users },
  { name: 'Trends', href: '/trends', icon: TrendingUp },
  { name: 'Analytics', href: '/analytics', icon: ChartPie },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Brain },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { currentWorkspace, scenario } = useStore();
  const navigation = useMemo(() => {
    // Start from base and clone so we can mutate labels safely
    const items = [...baseNav.map((x) => ({ ...x }))];
    // Insert Clients for Agency
    if (currentWorkspace?.type === 'Agency') {
      items.splice(2, 0, { name: 'Clients', href: '/clients', icon: Users });
    }
    // Scenario-aware label tweaks
    const isCreator = scenario === 'creator' || currentWorkspace?.type === 'Individual';
    const isBusiness = scenario === 'business' || currentWorkspace?.type === 'Organization';
    const isAgency = currentWorkspace?.type === 'Agency';
    items.forEach((it) => {
      if (it.href === '/engagement') {
        it.name = isCreator ? 'Audience Engagement' : isBusiness ? 'Responses' : isAgency ? 'Engagement Hub' : it.name;
      }
      if (it.href === '/pulse') {
        it.name = isCreator ? 'Mentions Pulse' : isBusiness ? 'Reputation Pulse' : 'Pulse Monitor';
      }
      if (it.href === '/competitors') {
        it.name = isCreator ? 'Peers' : 'Competitors';
      }
      if (it.href === '/analytics') {
        it.name = isCreator ? 'Channel Analytics' : isBusiness ? 'Reviews Analytics' : isAgency ? 'Portfolio Analytics' : 'Analytics';
      }
    });
    return items;
  }, [currentWorkspace?.type, scenario]);

  return (
    <aside
      className={cn(
        'dashboard-card border-r pt-5 pb-4 overflow-y-auto transition-all duration-300',
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