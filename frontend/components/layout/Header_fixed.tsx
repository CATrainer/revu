// frontend/components/layout/Header.tsx
'use client';

import { useState } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    <header className="bg-white dark:bg-[hsl(222,84%,6%)] shadow-sm border-b border-gray-200 dark:border-[hsl(222,47%,16%)]">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden hover:bg-gray-100 dark:hover:bg-[hsl(222,84%,12%)]"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="hidden sm:block ml-4 lg:ml-0">
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
                  className="w-64 bg-white dark:bg-[hsl(222,84%,8%)] border-gray-300 dark:border-[hsl(222,47%,16%)]"
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
                  className="hover:bg-gray-100 dark:hover:bg-[hsl(222,84%,12%)]"
                >
                  <X className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="hover:bg-gray-100 dark:hover:bg-[hsl(222,84%,12%)]"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative hover:bg-gray-100 dark:hover:bg-[hsl(222,84%,12%)]">
                  <Bell className="h-5 w-5" />
                  {mockNotifications.some(n => n.unread) && (
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-80 bg-white dark:bg-[hsl(222,84%,8%)] border-gray-200 dark:border-[hsl(222,47%,16%)]"
              >
                <DropdownMenuLabel className="text-gray-900 dark:text-[hsl(215,20%,85%)]">Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-[hsl(222,47%,16%)]" />
                {mockNotifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    className="flex flex-col items-start p-4 hover:bg-gray-50 dark:hover:bg-[hsl(222,84%,12%)]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <h4 className={`text-sm font-medium ${notification.unread ? 'text-gray-900 dark:text-[hsl(215,20%,85%)]' : 'text-gray-600 dark:text-[hsl(215,20%,65%)]'}`}>
                        {notification.title}
                      </h4>
                      {notification.unread && (
                        <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-[hsl(215,20%,65%)] mt-1">
                      {notification.message}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-[hsl(215,20%,55%)] mt-2">
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
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-[hsl(222,84%,12%)]">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url || ''} alt={user?.full_name || ''} />
                    <AvatarFallback className="bg-[hsl(263,70%,68%)] text-white">
                      {user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 bg-white dark:bg-[hsl(222,84%,8%)] border-gray-200 dark:border-[hsl(222,47%,16%)]" 
                align="end" 
                forceMount
              >
                <DropdownMenuLabel className="font-normal text-gray-900 dark:text-[hsl(215,20%,85%)]">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-gray-500 dark:text-[hsl(215,20%,65%)]">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-[hsl(222,47%,16%)]" />
                <DropdownMenuItem className="hover:bg-gray-50 dark:hover:bg-[hsl(222,84%,12%)]">
                  <span className="text-gray-900 dark:text-[hsl(215,20%,85%)]">Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-gray-50 dark:hover:bg-[hsl(222,84%,12%)]">
                  <span className="text-gray-900 dark:text-[hsl(215,20%,85%)]">Billing</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-gray-50 dark:hover:bg-[hsl(222,84%,12%)]">
                  <span className="text-gray-900 dark:text-[hsl(215,20%,85%)]">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-[hsl(222,47%,16%)]" />
                <DropdownMenuItem 
                  onClick={logout}
                  className="hover:bg-gray-50 dark:hover:bg-[hsl(222,84%,12%)]"
                >
                  <span className="text-gray-900 dark:text-[hsl(215,20%,85%)]">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
