// frontend/components/layout/Header.tsx
'use client';

import { useState } from 'react';
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
import { generateAllDemoData } from '@/lib/demo-data';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { notifications, markNotificationsRead, markNotificationRead, scenario, setScenario, setInteractions, addNotification, notificationPrefs, badgeRespectsMute, setBadgeRespectsMute } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [showMuted, setShowMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const items = notifications.items.map((n) => ({ id: n.id, title: n.title, message: n.message, time: new Date(n.createdAt).toLocaleTimeString(), unread: !n.read }));
  const unreadCount = (() => {
    if (!badgeRespectsMute) return notifications.unread;
    // compute unread excluding muted items by keyword/platform when possible
    const platformIdMap: Record<string, string> = { google: 'Google', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', twitter: 'X/Twitter', tripadvisor: 'Google' };
    return notifications.items.filter((it) => {
      if (it.read) return false;
      const hay = `${it.title} ${it.message}`.toLowerCase();
      if (notificationPrefs.muteKeywords.some(k => hay.includes(k.toLowerCase()))) return false;
      // best-effort platform match from title
      if (notificationPrefs.mutedPlatforms.length) {
        const mutedNames = notificationPrefs.mutedPlatforms.map(k => platformIdMap[k]);
        if (mutedNames.some(name => it.title.includes(name))) return false;
      }
      if (notificationPrefs.mode === 'Important only') {
        // heuristic: only count if title hints negative or priority
        const t = it.title.toLowerCase();
        if (!(t.includes('negative') || t.includes('high'))) return false;
      }
      return true;
    }).length;
  })();

  return (
  <header className="card-background shadow-sm border-b border-[var(--border)]">
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
            </div>
            <div className="hidden sm:block lg:hidden ml-4">
              <LocationSelector />
            </div>
          </div>

          <div className="flex items-center space-x-4">
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

            {/* Scenario selector */}
            <div className="hidden md:block">
              <select
                aria-label="Scenario"
                className="card-background border-[var(--border)] rounded-md px-2 py-1 text-sm"
                value={scenario}
                onChange={(e) => {
                  const s = e.target.value as typeof scenario;
                  setScenario(s);
                  // Reseed interactions to match scenario flavor
                  const flavor = s === 'agency-businesses' ? 'agency-businesses' : s === 'agency-creators' ? 'agency-creators' : 'default';
                  const { interactions } = generateAllDemoData(flavor as 'default' | 'agency-creators' | 'agency-businesses');
                  setInteractions(interactions);
                  addNotification({ id: `scenario_${Date.now()}`, title: 'Scenario changed', message: `Now viewing ${s.replace('-', ' ')}`, createdAt: new Date().toISOString(), severity: 'info' });
                }}
              >
                <option value="creator">Creator</option>
                <option value="business">Business</option>
                <option value="agency-creators">Agency (Creators)</option>
                <option value="agency-businesses">Agency (Businesses)</option>
              </select>
            </div>

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
                className="w-80 card-background border-[var(--border)]"
              >
                <DropdownMenuLabel className="text-primary-dark">Notifications</DropdownMenuLabel>
                <div className="px-3 py-2 text-xs text-secondary-dark flex items-center justify-between">
                  <span>Badge respects mute</span>
                  <input type="checkbox" checked={badgeRespectsMute} onChange={(e) => setBadgeRespectsMute(e.target.checked)} />
                </div>
                <div className="px-3 -mt-2 pb-2 text-xs text-secondary-dark flex items-center justify-between">
                  <span>Show muted items</span>
                  <input type="checkbox" checked={showMuted} onChange={(e) => setShowMuted(e.target.checked)} />
                </div>
                <DropdownMenuSeparator className="bg-[var(--border)]" />
                {items.length === 0 && (
                  <div className="p-4 text-sm text-secondary-dark">No notifications</div>
                )}
        {items
          .filter(n => {
            if (showMuted) return true;
            const hay = `${n.title} ${n.message}`.toLowerCase();
            if (notificationPrefs.muteKeywords.some(k => hay.includes(k.toLowerCase()))) return false;
            return true;
          })
          .map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    className="flex flex-col items-start p-4 hover:section-background-alt cursor-pointer"
                    onClick={() => {
                      // Simple routing based on title keywords (demo)
                      const t = notification.title.toLowerCase();
          markNotificationRead(notification.id);
                      if (t.includes('review')) router.push('/reviews');
                      else if (t.includes('response')) router.push('/engagement');
                      else if (t.includes('report')) router.push('/analytics');
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <h4 className={`text-sm font-medium ${notification.unread ? 'text-primary-dark' : 'text-secondary-dark'}`}>
                        {notification.title}
                      </h4>
                      {notification.unread && (
                        <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-muted-dark mt-1">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-dark mt-2">
                      {notification.time}
                    </span>
                  </DropdownMenuItem>
                ))}
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
                <DropdownMenuItem className="hover:section-background-alt" onClick={() => router.push('/profile')}>
                  <span className="text-primary-dark">Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:section-background-alt" onClick={() => router.push('/billing')}>
                  <span className="text-primary-dark">Billing</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:section-background-alt" onClick={() => router.push('/settings')}>
                  <span className="text-primary-dark">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--border)]" />
                <DropdownMenuItem 
                  onClick={logout}
                  className="hover:section-background-alt"
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
