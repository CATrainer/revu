// frontend/components/layout/Header.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, BarChart3, Brain, ChartPie, Settings as SettingsIcon, MessageSquare, Zap, Radio } from 'lucide-react';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
import { features } from '@/lib/features';

interface HeaderProps {
  onMenuClick: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Interactions', href: '/interactions', icon: MessageSquare },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Brain },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { alertHistory } = useStore();
  const [showAlertBanner, setShowAlertBanner] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{status: 'active'|'paused'; paused_until?: string|null; test_mode?: boolean; auto_pause_on_spike?: boolean}>({status: 'active'});
  const [pauseLoading, setPauseLoading] = useState(false);
  const [sysUpdateLoading, setSysUpdateLoading] = useState(false);
  const personaLabel = user?.user_kind === 'business' ? 'Business' : 'Content';
  const personaColor = user?.user_kind === 'business'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-purple-100 text-purple-700 border-purple-200';

  // Simple auto-banner for the latest alert
  useEffect(() => {
    if (alertHistory.length > 0) {
      setShowAlertBanner(true);
    }
  }, [alertHistory.length]);

  useEffect(() => {
    // System status polling disabled - endpoint not implemented yet
    // TODO: Re-enable when /api/v1/system/status endpoint is created
    /*
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/v1/system/status');
        if (res.ok) {
          const data = await res.json();
          setSystemStatus({ status: data.status, paused_until: data.paused_until, test_mode: !!data.test_mode, auto_pause_on_spike: !!data.auto_pause_on_spike });
        }
      } catch (err) {
        console.debug('[Header] System status check failed');
      }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 15000);
    return () => { clearInterval(id); };
    */
  }, []);

  const pauseAll = async (minutes = 60) => {
    if (!confirm(`Pause all automation for ${minutes} minutes?`)) return;
    setPauseLoading(true);
    try {
  const res = await fetch('/api/v1/system/pause', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration_minutes: minutes, reason: 'user_pause_from_header' })});
      if (res.ok) {
        const data = await res.json();
        setSystemStatus({ status: 'paused', paused_until: data.paused_until });
      }
    } finally {
      setPauseLoading(false);
    }
  };

  const resumeAll = async () => {
    if (!confirm('Resume automation now?')) return;
    setPauseLoading(true);
    try {
  const res = await fetch('/api/v1/system/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'user_resume_from_header' })});
      if (res.ok) {
        setSystemStatus({ status: 'active' });
      }
    } finally {
      setPauseLoading(false);
    }
  };

  const setTestMode = async (enabled: boolean) => {
    setSysUpdateLoading(true);
    try {
      const res = await fetch('/api/v1/system/test-mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled })});
      if (res.ok) {
        setSystemStatus((s) => ({ ...s, test_mode: enabled }));
      }
    } finally {
      setSysUpdateLoading(false);
    }
  };

  const setAutoPauseOnSpike = async (enabled: boolean) => {
    setSysUpdateLoading(true);
    try {
      const res = await fetch('/api/v1/system/auto-pause-on-spike', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled })});
      if (res.ok) {
        setSystemStatus((s) => ({ ...s, auto_pause_on_spike: enabled }));
      }
    } finally {
      setSysUpdateLoading(false);
    }
  };

  return (
  <header className="nav-background soft-shadow elevated">
      {(systemStatus.status === 'paused') && (
        <div className="px-4 sm:px-6 lg:px-8 py-2 bg-rose-50 border-b border-[var(--border)] flex items-center justify-between">
          <div className="text-sm text-primary-dark">⛔ Automation paused {systemStatus.paused_until ? `until ${new Date(systemStatus.paused_until).toLocaleString()}` : '(manual)'}.</div>
          <div className="flex items-center gap-2">
            <button className="text-xs underline" disabled={pauseLoading} onClick={resumeAll}>Resume now</button>
          </div>
        </div>
      )}
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
          <div className="flex items-center gap-6">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden h-10 w-10 p-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full bg-white dark:bg-slate-900">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <Image src="/logo/mark.png" alt="Repruv" width={32} height={32} className="h-8 w-8" priority />
                      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Repruv</span>
                    </Link>
                  </div>
                  <nav className="flex-1 p-4 space-y-1">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo/mark.png" alt="Repruv" width={32} height={32} className="h-8 w-8" priority />
              <span className="hidden md:block text-lg font-semibold text-slate-900 dark:text-slate-100">Repruv</span>
            </Link>
            
            {/* Navigation Links - Desktop */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Emergency controls & global toggles (conditional) */}
            {features.showEmergencyControls && (
              <div className="hidden md:flex items-center gap-2 mr-2">
                {systemStatus.status === 'active' ? (
                  <Button size="sm" variant="destructive" className="bg-rose-600 hover:bg-rose-700" disabled={pauseLoading} onClick={() => pauseAll(60)} title="Pause all automation for 1 hour">
                    <PauseCircle className="h-4 w-4 mr-1" /> Pause all
                  </Button>
                ) : (
                  <Button size="sm" variant="default" disabled={pauseLoading} onClick={resumeAll} title="Resume all automation">
                    <PlayCircle className="h-4 w-4 mr-1" /> Resume
                  </Button>
                )}
                {features.showTestModeToggle && (
                  <label className="flex items-center gap-2 text-xs text-secondary-dark ml-2" title="Run actions in simulation mode only">
                    <input
                      type="checkbox"
                      checked={!!systemStatus.test_mode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      disabled={sysUpdateLoading}
                    />
                    Test mode
                  </label>
                )}
                {features.showAutoPauseToggle && (
                  <label className="flex items-center gap-2 text-xs text-secondary-dark" title="Automatically pause on extreme spikes (e.g., 5x)">
                    <input
                      type="checkbox"
                      checked={!!systemStatus.auto_pause_on_spike}
                      onChange={(e) => setAutoPauseOnSpike(e.target.checked)}
                      disabled={sysUpdateLoading}
                    />
                    Auto-pause on spike
                  </label>
                )}
              </div>
            )}
            {/* Persona badge (conditional) */}
            {features.showPersonaBadge && (
              <span
                title={`Persona: ${personaLabel}`}
                className={`hidden md:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${personaColor}`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${personaColor.split(' ').find(c=>c.startsWith('bg-')) || 'bg-blue-500'}`}></span>
                {personaLabel}
              </span>
            )}

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
                <DropdownMenuItem className="hover-background" onClick={() => router.push('/settings')}>
                  <span className="text-primary-dark">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover-background" onClick={() => router.push('/')}>
                  <span className="text-primary-dark">Exit App</span>
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
