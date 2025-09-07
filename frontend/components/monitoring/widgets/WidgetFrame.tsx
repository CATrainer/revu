import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import clsx from 'clsx';

interface WidgetFrameProps {
  id: string;
  title: string;
  onRemove?: (id: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
}

export const WidgetFrame: React.FC<WidgetFrameProps> = ({ id, title, onRemove, onRefresh, loading, error, children }) => {
  return (
    <div className={clsx("relative group rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-sm p-4 flex flex-col min-h-[180px] overflow-hidden",
      "hover:border-white/20 transition-colors")}>      
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold tracking-wide text-white/90">{title}</h3>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRefresh && (
            <button onClick={onRefresh} className="p-1 rounded hover:bg-white/10" aria-label="Refresh" disabled={loading}>
              <RefreshCw className={clsx("w-4 h-4", loading && 'animate-spin opacity-70')} />
            </button>
          )}
          {onRemove && (
            <button onClick={() => onRemove(id)} className="p-1 rounded hover:bg-white/10" aria-label="Remove widget">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {loading && !error && (
        <div className="flex-1 animate-pulse rounded-md bg-white/10" />
      )}
      {!loading && error && (
        <div className="text-xs text-red-300 bg-red-500/10 rounded p-2">{error}</div>
      )}
      {!loading && !error && (
        <div className="flex-1 text-white/80 text-xs">{children}</div>
      )}
    </div>
  );
};
