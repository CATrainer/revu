// frontend/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  MessageSquare,
  Brain,
  Trophy,
  Zap,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Review Hub', href: '/reviews', icon: MessageSquare },
  { name: 'Ask Repruv AI', href: '/ai-assistant', icon: Brain },
  { name: 'Competitors', href: '/competitors', icon: Trophy },
  { name: 'Automation', href: '/automation', icon: Zap },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'dashboard-card border-r pt-5 pb-4 overflow-y-auto transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between px-4 mb-8">
        {!collapsed && (
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold brand-text">Repruv</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover-background"
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