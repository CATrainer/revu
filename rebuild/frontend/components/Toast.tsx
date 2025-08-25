"use client";
import React from 'react';

type Toast = { id: number; kind: 'success'|'error'|'info'; text: string };

const Ctx = React.createContext<{ push: (t: Omit<Toast,'id'>)=>void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const idRef = React.useRef(1);
  const push = React.useCallback((t: Omit<Toast,'id'>) => {
    const id = idRef.current++;
    setItems(prev => [...prev, { id, ...t }]);
    setTimeout(() => setItems(prev => prev.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed top-3 right-3 space-y-2 z-50">
        {items.map(t => (
          <div key={t.id} className={`px-3 py-2 rounded shadow text-sm ${t.kind==='success'?'bg-green-600 text-white':t.kind==='error'?'bg-red-600 text-white':'bg-gray-800 text-white'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
