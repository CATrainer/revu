"use client";

import { useDemoMode } from '@/contexts/DemoModeContext';

export function DemoBanner() {
  const { isDemoMode, demoPersona, simulateNewActivity } = useDemoMode();
  if (!isDemoMode) return null;
  return (
    <div className="w-full bg-amber-100 text-amber-900 border-b border-amber-300 px-4 py-2 text-sm flex items-center justify-between">
      <div>
        Demo mode active{demoPersona ? ` — ${demoPersona.replace('_', ' ')}` : ''}. Data shown is simulated.
      </div>
      <button className="underline" onClick={() => simulateNewActivity()}>Simulate new comments</button>
    </div>
  );
}
