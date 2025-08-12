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
import { ThemeToggle } from '@/components/shared/ThemeToggle';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
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

  const mockNotifications = [
    { id: 1, title: 'New review received', message: 'You have a new 5-star review on Google', time: '2 minutes ago', unread: true },
    { id: 2, title: 'Response needed', message: 'Customer feedback requires your attention', time: '1 hour ago', unread: true },
    { id: 3, title: 'Monthly report ready', message: 'Your analytics report is now available', time: '2 hours ago', unread: false },
  ];

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

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative hover-background">
                  <Bell className="h-5 w-5" />
                  {mockNotifications.some(n => n.unread) && (
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-80 card-background border-[var(--border)]"
              >
                <DropdownMenuLabel className="text-primary-dark">Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[var(--border)]" />
                {mockNotifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    className="flex flex-col items-start p-4 hover:section-background-alt"
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
                <DropdownMenuItem className="hover:section-background-alt">
                  <span className="text-primary-dark">Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:section-background-alt">
                  <span className="text-primary-dark">Billing</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:section-background-alt">
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
