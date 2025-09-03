"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

type HelpContextType = {
  tipsEnabled: boolean;
  setTipsEnabled: (v: boolean) => void;
  seenThisSession: Set<string>;
  markSeen: (key: string) => void;
  record: (key: string, action: 'viewed'|'helpful'|'dismissed'|'learn_more', meta?: Record<string, unknown>) => void;
};

const HelpCtx = createContext<HelpContextType | null>(null);

export function useHelp() {
  const ctx = useContext(HelpCtx);
  if (!ctx) throw new Error('HelpProvider missing');
  return ctx;
}

export default function HelpProvider({ children }: { children: React.ReactNode }) {
  const [tipsEnabled, setTipsEnabledState] = useState(true);
  const seenThisSession = useMemo(() => new Set<string>(), []);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    (async () => {
      try {
        const { data } = await api.get('/automation/notifications/prefs');
        setTipsEnabledState(!!data?.help_tips_enabled);
      } catch {
        // ignore
      }
    })();
  }, []);

  async function setTipsEnabled(v: boolean) {
    setTipsEnabledState(v);
    try { await api.post('/automation/notifications/prefs', { help_tips_enabled: v }); } catch {}
  }

  function markSeen(key: string) {
    seenThisSession.add(key);
  }

  function record(key: string, action: 'viewed'|'helpful'|'dismissed'|'learn_more', meta?: Record<string, unknown>) {
    // Fire and forget
    void api.post('/automation/help/events', { tip_key: key, action, meta }).catch(() => {});
  }

  return (
    <HelpCtx.Provider value={{ tipsEnabled, setTipsEnabled, seenThisSession, markSeen, record }}>
      {children}
    </HelpCtx.Provider>
  );
}
