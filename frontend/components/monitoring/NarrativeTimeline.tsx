"use client";
import React from 'react';
import clsx from 'clsx';

interface EventPoint { ts: string | Date; mentions: number; sentiment: number; key?: boolean; label?: string; }
interface NarrativeTimelineProps { data: EventPoint[]; className?: string; }

export const NarrativeTimeline: React.FC<NarrativeTimelineProps> = ({ data, className }) => {
  // Expect chronological data
  const points = data.slice().sort((a,b)=> new Date(a.ts).getTime() - new Date(b.ts).getTime());
  if (points.length === 0) return <div className="text-[11px] text-white/40">No timeline data</div>;
  const maxMentions = Math.max(...points.map(p=> p.mentions || 1));

  return (
    <div className={clsx('relative w-full h-40', className)}>
      <svg viewBox="0 0 1000 200" className="absolute inset-0 w-full h-full">
        {/* Volume bars */}
        {points.map((p,i)=> {
          const x = (i/(points.length-1)) * 1000;
            const h = (p.mentions/maxMentions)*120;
            return <rect key={i} x={x-6} y={170-h} width={12} height={h} fill="rgba(56,189,248,0.25)" rx={2} />
        })}
        {/* Sentiment line */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          points={points.map((p,i)=> {
            const x = (i/(points.length-1))*1000;
            const y = 170 - ((p.sentiment+1)/2)*120; // map -1..1 -> 0..120
            return `${x},${y}`;
          }).join(' ')}
        />
        {/* Key events */}
        {points.map((p,i)=> p.key ? (
          <g key={'k'+i}>
            <circle cx={(i/(points.length-1))*1000} cy={40} r={6} fill="#f59e0b" />
            {p.label && <text x={(i/(points.length-1))*1000} y={28} textAnchor="middle" className="fill-white text-[8px]">{p.label}</text>}
          </g>
        ): null)}
      </svg>
      <div className="absolute bottom-1 left-0 right-0 flex justify-between text-[8px] text-white/30 px-1">
        {points.map((p,i)=> (
          <span key={i}>{new Date(p.ts).toLocaleDateString(undefined,{month:'numeric', day:'numeric'})}</span>
        ))}
      </div>
    </div>
  );
};
