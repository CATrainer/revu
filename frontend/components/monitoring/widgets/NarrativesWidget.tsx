import React from 'react';
import { WidgetFrame } from './WidgetFrame';

interface Thread { title: string; sentiment: number; mention_count: number; }

export const NarrativesWidget: React.FC<{id:string; onRemove?: (id:string)=>void;}> = ({id,onRemove}) => {
  const [threads,setThreads]=React.useState<Thread[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState<string|null>(null);

  const load = React.useCallback(()=>{
    setLoading(true); setError(null);
    fetch('/api/v1/monitoring/narratives?limit=5')
      .then(r=>r.json())
      .then(json=> setThreads(json?.items || []))
      .catch(e=> setError(e.message))
      .finally(()=> setLoading(false));
  },[]);

  React.useEffect(()=>{load();},[load]);

  return (
    <WidgetFrame id={id} title="Narratives" onRemove={onRemove} loading={loading} error={error} onRefresh={load}>
      <ul className="space-y-2">
        {threads.map((t,i)=> (
          <li key={i} className="flex items-center gap-2">
            <div className="flex-1 truncate text-xs">{t.title || 'Untitled'}</div>
            <div className="w-16 text-right text-emerald-300 text-xs">{(t.sentiment*100).toFixed(0)}%</div>
            <div className="w-10 text-right text-white/60 text-[10px]">{t.mention_count}</div>
          </li>
        ))}
        {threads.length===0 && !loading && <li className="text-xs text-white/50">No threads</li>}
      </ul>
    </WidgetFrame>
  );
};
