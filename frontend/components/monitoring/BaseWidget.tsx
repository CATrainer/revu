"use client";
import React from 'react';
import { RefreshCw, MoreVertical, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface BaseWidgetProps {
  title: string;
  onRefresh?: () => Promise<unknown> | void;
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
  initialCollapsed?: boolean;
  loading?: boolean;
  error?: string | null;
  height?: string;
}

export const BaseWidget: React.FC<BaseWidgetProps> = ({
  title,
  onRefresh,
  onRemove,
  children,
  className,
  initialCollapsed=false,
  loading: controlledLoading,
  error: controlledError,
  height = 'h-60'
}) => {
  const [collapsed,setCollapsed] = React.useState(initialCollapsed);
  const [loading,setLoading] = React.useState(false);
  const [error,setError] = React.useState<string|null>(null);
  const [confirmRemove,setConfirmRemove] = React.useState(false);
  const mountedRef = React.useRef(true);
  React.useEffect(()=>()=>{ mountedRef.current=false; },[]);

  const effectiveLoading = controlledLoading ?? loading;
  const effectiveError = controlledError ?? error;

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setLoading(true); setError(null);
    try { await onRefresh(); } catch(e: unknown){ const msg = e instanceof Error ? e.message : 'Failed'; setError(msg); }
    finally { if(mountedRef.current) setLoading(false); }
  };

  const remove = () => {
    if (!onRemove) return;
    if (!confirmRemove) { setConfirmRemove(true); setTimeout(()=> setConfirmRemove(false), 2500); return; }
    onRemove();
  };

  return (
    <div className={clsx('group relative rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-sm flex flex-col overflow-hidden transition-all', collapsed? '': 'hover:scale-[1.02]', className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <button onClick={()=> setCollapsed(c=>!c)} className="p-1 rounded hover:bg-white/10" aria-label="Toggle">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <h3 className="text-sm font-semibold tracking-wide text-white/90 select-none">{title}</h3>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRefresh && (
            <button onClick={handleRefresh} className="p-1 rounded hover:bg-white/10 disabled:opacity-50" disabled={effectiveLoading} aria-label="Refresh">
              <RefreshCw className={clsx('w-4 h-4', effectiveLoading && 'animate-spin text-white/60')} />
            </button>
          )}
          {onRemove && (
            <button onClick={remove} className={clsx('px-2 py-1 rounded text-[10px] uppercase tracking-wide', confirmRemove? 'bg-red-500/20 text-red-300 border border-red-400/40':'bg-white/5 text-white/60 hover:bg-white/10')}>
              {confirmRemove? 'Confirm' : 'Remove'}
            </button>
          )}
          <button className="p-1 rounded hover:bg-white/10" aria-label="Settings">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className={clsx('relative flex-1 p-4', height)}>
          {effectiveLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 text-xs text-white/60">
              <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mb-2" />
              Loading
            </div>
          )}
          {effectiveError && !effectiveLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-red-300 text-xs gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{effectiveError}</span>
              {onRefresh && (
                <button onClick={handleRefresh} className="px-3 py-1 rounded bg-red-500/20 border border-red-400/40 text-red-200 text-[11px] hover:bg-red-500/30">Retry</button>
              )}
            </div>
          )}
          {!effectiveError && !effectiveLoading && (
            <div className="h-full w-full">{children}</div>
          )}
        </div>
      )}
    </div>
  );
};
