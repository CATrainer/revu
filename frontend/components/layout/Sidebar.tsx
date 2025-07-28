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
  { name: 'Ask RevU AI', href: '/ai-assistant', icon: Brain },
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
        'bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between px-4 mb-8">
        {!collapsed && (
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-indigo-600">Revu</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-gray-100"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-500" />
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
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'flex-shrink-0 h-5 w-5 transition-colors',
                    collapsed ? 'mr-0' : 'mr-3',
                    isActive
                      ? 'text-indigo-700'
                      : 'text-gray-400 group-hover:text-gray-500'
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