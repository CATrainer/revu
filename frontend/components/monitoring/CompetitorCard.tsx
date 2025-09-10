"use client";
import React from 'react';
import clsx from 'clsx';

interface Metric { label: string; current: number; prev?: number; }
interface CompetitorCardProps { name: string; platform?: string; metrics: Metric[]; onView?: ()=>void; }

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return <div className="h-8" />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v,i)=> `${(i/(values.length-1))*100},${100-((v-min)/range)*100}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" className="w-full h-8">
      <polyline fill="none" stroke="#6366f1" strokeWidth={2} points={pts} />
    </svg>
  );
}

export const CompetitorCard: React.FC<CompetitorCardProps> = ({ name, platform='twitter', metrics, onView }) => {
  return (
    <div className="p-4 rounded-lg bg-card/80 backdrop-blur border border-border/60 flex flex-col gap-3 hover:scale-[1.02] transition-all">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{name}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/40">{platform}</span>
        </div>
        {onView && <button onClick={onView} className="text-[11px] px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10">Details</button>}
      </div>
      <Sparkline values={metrics.map(m=> m.current)} />
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {metrics.map((m,i)=>{
          const delta = m.prev !== undefined ? m.current - m.prev : undefined;
          const up = delta !== undefined ? delta >= 0 : undefined;
          return (
            <div key={i} className="p-2 rounded bg-black/30 border border-white/5 flex flex-col gap-1">
              <span className="text-white/50 uppercase">{m.label}</span>
              <span className="text-white/90 font-semibold">{m.current}</span>
              {delta !== undefined && (
                <span className={clsx('text-[9px]', up ? 'text-emerald-400' : 'text-red-400')}>
                  {up? '+' : ''}{delta}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
