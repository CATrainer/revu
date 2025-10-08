// frontend/components/layout/AccountDropdown.tsx
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { User, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AccountDropdownProps {
  variant?: 'landing' | 'waiting';
}

export function AccountDropdown({ variant = 'landing' }: AccountDropdownProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleNavigateToApp = () => {
    if (user.is_admin) {
      router.push('/admin');
      return;
    }
    if (user.access_status === 'full') {
      router.push(user.user_kind === 'business' ? '/under-construction' : '/dashboard');
      return;
    }
    router.push('/waiting-area');
  };

  const getNavigationLabel = () => {
    if (user.is_admin) return 'Go to Admin Area';
    if (user.access_status === 'full') return user.user_kind === 'business' ? 'Go to Under Construction' : 'Go to Dashboard';
    return 'My Account';
  };

  const isWaitingVariant = variant === 'waiting';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatars/01.png" alt={user?.full_name} />
            <AvatarFallback>
              {user?.full_name?.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.full_name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
