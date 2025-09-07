import React from 'react';
import { WidgetFrame } from './WidgetFrame';

interface Topic { term: string; weight: number; }

export const TrendingTopicsWidget: React.FC<{id:string; onRemove?: (id:string)=>void;}> = ({id,onRemove}) => {
  const [topics,setTopics]=React.useState<Topic[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState<string|null>(null);

  const load = React.useCallback(()=>{
    setLoading(true); setError(null);
    fetch('/api/v1/monitoring/dashboard')
      .then(r=>r.json())
      .then(json=>{
        interface RawTopic { topic?: string; term?: string; score?: number; weight?: number }
        const raw: RawTopic[] = json?.trending_topics || [];
        const t = raw.map(rt=>({ term: rt.topic || rt.term || 'topic', weight: rt.score || rt.weight || 1 })).slice(0,15);
        setTopics(t);
      })
      .catch(e=> setError(e.message))
      .finally(()=> setLoading(false));
  },[]);

  React.useEffect(()=>{load();},[load]);

  return (
    <WidgetFrame id={id} title="Trending" onRemove={onRemove} loading={loading} error={error} onRefresh={load}>
      <div className="flex flex-wrap gap-2 text-[10px]">
        {topics.map(t=> (
          <span key={t.term} className="px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-200 border border-emerald-400/20" style={{fontSize: 10 + Math.min(8, t.weight) }}>
            {t.term}
          </span>
        ))}
        {!loading && topics.length===0 && <div className="text-xs text-white/40">No topics</div>}
      </div>
    </WidgetFrame>
  );
};
