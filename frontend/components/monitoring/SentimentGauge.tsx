"use client";
import React from 'react';
import clsx from 'clsx';

interface SentimentGaugeProps {
  value: number; // -1 to 1
  breakdown?: { platform: string; sentiment: number }[];
  className?: string;
}

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({ value, breakdown = [], className }) => {
  const pct = Math.max(-1, Math.min(1, value));
  const deg = (pct + 1) * 90; // -1->0deg, 1->180deg

  return (
    <div className={clsx('relative w-full h-full flex items-center justify-center', className)} title={breakdown.map(b=> `${b.platform}: ${(b.sentiment*100).toFixed(0)}%`).join('\n')}>
      <svg viewBox="0 0 100 60" className="w-full max-w-[180px]">
        <defs>
          <linearGradient id="sentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="url(#sentGradient)" strokeWidth="10" strokeLinecap="round" />
        <g transform={`rotate(${deg} 50 50)`}>
          <line x1="50" y1="50" x2="50" y2="14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="50" r="4" fill="#fff" />
        </g>
        <text x="50" y="55" textAnchor="middle" className="fill-white text-sm font-semibold">
          {(pct*100).toFixed(0)}%
        </text>
      </svg>
      <div className="absolute bottom-2 text-[10px] text-white/50">Sentiment</div>
    </div>
  );
};
