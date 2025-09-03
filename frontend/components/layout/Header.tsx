// frontend/components/layout/Header.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Bell, Menu, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { LocationSelector } from '@/components/dashboard/LocationSelector';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useStore } from '@/lib/store';
import NotificationCenter from '@/components/shared/NotificationCenter';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { notifications, markNotificationsRead, notificationPrefs, badgeRespectsMute, setBadgeRespectsMute, alertHistory } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlertBanner, setShowAlertBanner] = useState(false);
  const personaLabel = user?.user_kind === 'business' ? 'Business' : 'Content';
  const personaColor = user?.user_kind === 'business'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-purple-100 text-purple-700 border-purple-200';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implement actual search functionality
      console.log('Searching for:', searchQuery);
      // For now, just close the search
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const unreadCount = (() => {
    if (!badgeRespectsMute) return notifications.unread;
    // compute unread excluding muted items by keyword/platform when possible
    const platformIdMap: Record<string, string> = { google: 'Google', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', twitter: 'X/Twitter', tripadvisor: 'Google' };
    return notifications.items.filter((it) => {
      if (it.read) return false;
      const hay = `${it.title} ${it.message}`.toLowerCase();
      if (notificationPrefs.muteKeywords.some((k: string) => hay.includes(k.toLowerCase()))) return false;
      // best-effort platform match from title
      if (notificationPrefs.mutedPlatforms.length) {
        const mutedNames = notificationPrefs.mutedPlatforms.map((k: string) => platformIdMap[k] || k);
        if (mutedNames.some((name: string) => it.title.includes(name))) return false;
      }
      if (notificationPrefs.mode === 'Important only') {
        // heuristic: only count if title hints negative or priority
        const t = it.title.toLowerCase();
        if (!(t.includes('negative') || t.includes('high'))) return false;
      }
      return true;
    }).length;
  })();

  // Simple auto-banner for the latest alert
  useEffect(() => {
    if (alertHistory.length > 0) {
      setShowAlertBanner(true);
    }
  }, [alertHistory.length]);

  return (
  <header className="nav-background soft-shadow elevated">
      {showAlertBanner && alertHistory[0] && (
        <div className="px-4 sm:px-6 lg:px-8 py-2 bg-amber-50 border-b border-[var(--border)] flex items-center justify-between">
          <div className="text-sm text-primary-dark">⚠️ {alertHistory[0].title}: <span className="text-secondary-dark">{alertHistory[0].message}</span></div>
          <div className="flex items-center gap-2">
            <button className="text-xs underline" onClick={() => setShowAlertBanner(false)}>Dismiss</button>
          </div>
        </div>
      )}
  <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden hover-background"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden lg:flex items-center gap-3 ml-2">
              <Image src="/logo/mark.png" alt="Repruv" width={32} height={32} className="h-8 w-8" priority />
              {/* Location selector appears only when relevant (org/agency or demo agency) */}
              <LocationSelector />
              <button
                className="ml-2 text-xs px-2 py-1 rounded border border-[var(--border)] hover-background"
                onClick={() => router.push('/automation')}
                title="Open Automation"
              >Automation</button>
            </div>
            <div className="hidden sm:block lg:hidden ml-4">
              <LocationSelector />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Persona badge */}
            <span
              title={`Persona: ${personaLabel}`}
              className={`hidden md:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${personaColor}`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${personaColor.split(' ').find(c=>c.startsWith('bg-')) || 'bg-blue-500'}`}></span>
              {personaLabel}
            </span>
            {/* Search */}
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <Input
                  type="search"
                  placeholder="Search reviews, customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 card-background border-[var(--border)]"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="hover-background"
                >
                  <X className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="hover-background"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {/* Demo scenario selector and scenes removed */}

            {/* Notifications */}
            <DropdownMenu onOpenChange={(open) => { if (!open) markNotificationsRead(); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative hover-background">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-96 card-background border-[var(--border)]"
              >
                <DropdownMenuLabel className="text-primary-dark">Notifications</DropdownMenuLabel>
                <div className="px-3 py-2 text-xs text-secondary-dark flex items-center justify-between">
                  <span>Badge respects mute</span>
                  <input type="checkbox" checked={badgeRespectsMute} onChange={(e) => setBadgeRespectsMute(e.target.checked)} />
                </div>
                <DropdownMenuSeparator className="bg-[var(--border)]" />
                <NotificationCenter />
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover-background">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[var(--brand-primary-solid)] text-[var(--brand-primary-solid-foreground)]">
                      {user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 card-background border-[var(--border)]" 
                align="end" 
                forceMount
              >
                <DropdownMenuLabel className="font-normal text-primary-dark">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-dark">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[var(--border)]" />
                <DropdownMenuItem className="hover-background" onClick={() => router.push('/profile')}>
                  <span className="text-primary-dark">Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover-background" onClick={() => router.push('/billing')}>
                  <span className="text-primary-dark">Billing</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover-background" onClick={() => router.push('/settings')}>
                  <span className="text-primary-dark">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--border)]" />
                <DropdownMenuItem 
                  onClick={logout}
                  className="hover-background"
                >
                  <span className="text-primary-dark">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
