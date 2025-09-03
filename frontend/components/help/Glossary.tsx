"use client";
import { useState } from 'react';
import { useHelp } from './HelpProvider';
import { Button } from '@/components/ui/button';

const TERMS: Array<{ term: string; plain: string; example: string }> = [
  { term: 'A/B Test', plain: 'Compare two versions to see which one works better.', example: 'Test response A vs B to see which gets more clicks.' },
  { term: 'Confidence', plain: 'How sure we are about a result.', example: '95% confidence means we’re quite sure the winner is real.' },
  { term: 'Suggestion', plain: 'An optional change you can apply.', example: '“Switch to Response A” is a suggestion you can accept.' },
];

export default function Glossary() {
  const { tipsEnabled, setTipsEnabled } = useHelp();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <button aria-label="Glossary" className="text-xs px-2 py-1 rounded border" onClick={()=> setOpen(true)}>?</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-[92vw] max-w-[560px] rounded border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Glossary</div>
              <button onClick={()=> setOpen(false)} className="text-sm">Close</button>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {TERMS.map((t, i) => (
                <div key={i} className="p-2 rounded border">
                  <div className="font-medium">{t.term}</div>
                  <div className="text-muted-foreground">{t.plain}</div>
                  <div className="text-xs mt-1"><span className="font-medium">Example:</span> {t.example}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Tips are {tipsEnabled ? 'On' : 'Off'}</div>
              <Button size="sm" variant="outline" onClick={()=> setTipsEnabled(!tipsEnabled)}>{tipsEnabled ? 'Disable all tips' : 'Enable tips'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
