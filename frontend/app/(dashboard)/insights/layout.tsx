'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

const NAV_ITEMS = [
  {
    href: '/insights',
    label: 'Overview',
    icon: BarChart3,
    description: 'Key metrics & dashboard',
  },
  {
    href: '/insights/whats-working',
    label: "What's Working",
    icon: TrendingUp,
    description: 'Top performers',
  },
  {
    href: '/insights/whats-not-working',
    label: "What's Not Working",
    icon: TrendingDown,
    description: 'Needs attention',
  },
];

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Sub-navigation */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-6 py-3">
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/insights' && pathname.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
