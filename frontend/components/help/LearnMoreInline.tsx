"use client";
import { useState } from 'react';
import { useHelp } from './HelpProvider';

export default function LearnMoreInline({ tipKey, summary, children }: { tipKey: string; summary: string; children: React.ReactNode }) {
  const { tipsEnabled, record } = useHelp();
  const [open, setOpen] = useState(false);
  if (!tipsEnabled) return null;
  return (
    <div className="text-xs">
      <button className="underline" onClick={() => { setOpen(!open); record(tipKey, 'learn_more'); }}>{open ? 'Hide' : 'Learn more'}</button>
      {open && (
        <div className="mt-2 p-2 rounded border bg-white">
          <div className="mb-1 text-muted-foreground">{summary}</div>
          <div className="text-sm">{children}</div>
        </div>
      )}
    </div>
  );
}
