'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ModernCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  elevated?: boolean;
  interactive?: boolean;
}

export function ModernCard({ 
  children, 
  className, 
  hover = false, 
  glass = false, 
  elevated = false,
  interactive = false 
}: ModernCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        glass ? 'glass-card' : 'card-background',
        elevated && 'elevated-md',
        hover && 'hover-raise',
        interactive && 'cursor-pointer hover:shadow-lg',
        'animate-fade-in',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('p-6 pb-4', className)}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('p-6 pt-0', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-primary-dark', className)}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-secondary-dark mt-1', className)}>
      {children}
    </p>
  );
}
