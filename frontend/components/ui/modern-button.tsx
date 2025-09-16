'use client';

import { cn } from '@/lib/utils';
import { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ModernButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  asChild?: boolean;
}

export function ModernButton({ 
  children, 
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  asChild = false,
  ...props 
}: ModernButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    primary: 'bg-brand-primary-solid text-brand-primary-solid-foreground hover:bg-brand-primary-solid-hover shadow-sm hover:shadow-md',
    secondary: 'button-secondary hover:shadow-sm',
    ghost: 'hover:bg-muted hover:text-foreground',
    outline: 'border border-border bg-transparent hover:bg-muted hover:text-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm'
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
    md: 'h-10 px-4 py-2 rounded-lg gap-2',
    lg: 'h-12 px-6 py-3 text-lg rounded-xl gap-2.5'
  };

  if (asChild) {
    return (
      <div
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          'animate-scale-in',
          className
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        'animate-scale-in',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
}
