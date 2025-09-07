"use client";
import React from 'react';
import clsx from 'clsx';

export const LiveIndicator: React.FC<{ status: string; className?: string; }> = ({ status, className }) => {
  const color = status === 'open' ? 'bg-emerald-500' : status === 'reconnecting' ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className={clsx('flex items-center gap-2 text-[11px] font-medium', className)}>
      <span className={clsx('relative flex w-2 h-2', color)}>
        <span className={clsx('absolute inset-0 rounded-full animate-ping opacity-60', color)} />
        <span className={clsx('w-2 h-2 rounded-full', color)} />
      </span>
      <span className="uppercase tracking-wide text-white/60">{status === 'open' ? 'Live' : status}</span>
    </div>
  );
};
