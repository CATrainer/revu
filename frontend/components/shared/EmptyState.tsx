// frontend/components/shared/EmptyState.tsx
'use client';

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-[hsl(222,84%,12%)]">
          <Icon className="h-6 w-6 text-gray-400 dark:text-[hsl(215,20%,55%)]" />
        </div>
      )}
      <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-[hsl(215,20%,85%)]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-[hsl(215,20%,55%)]">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[hsl(263,70%,68%)] hover:bg-[hsl(263,70%,65%)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(263,70%,68%)]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}