"use client";
import { useState } from 'react';
import { useHelp } from './HelpProvider';

export default function SmartTooltip({ tipKey, title, reason, examples, children }: { tipKey: string; title: string; reason: string; examples: string[]; children: React.ReactNode }) {
  const { tipsEnabled, seenThisSession, markSeen, record } = useHelp();
  const [open, setOpen] = useState(false);
  if (!tipsEnabled) return <>{children}</>;
  const onEnter = () => {
    if (seenThisSession.has(tipKey)) return; // once per session
    markSeen(tipKey);
    record(tipKey, 'viewed');
    setOpen(true);
  };
  const onLeave = () => setOpen(false);
  return (
  <span className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave} onFocus={onEnter} onBlur={onLeave} tabIndex={0}>
      {children}
      {open && (
        <div className="absolute z-50 mt-2 w-80 max-w-[80vw] rounded border bg-white p-3 shadow-xl text-sm" style={{ left: 0 }}>
          <div className="font-medium mb-1">{title}</div>
          <div className="text-xs text-muted-foreground">{reason}</div>
          {examples?.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium">Examples</div>
              <ul className="list-disc pl-5 text-xs">
                {examples.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button className="text-xs underline" onClick={() => record(tipKey, 'helpful')}>Helpful</button>
            <button className="text-xs underline" onClick={() => record(tipKey, 'dismissed')}>Dismiss</button>
          </div>
        </div>
      )}
    </span>
  );
}
