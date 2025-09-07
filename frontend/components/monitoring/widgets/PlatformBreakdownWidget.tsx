import React from 'react';
import { WidgetFrame } from './WidgetFrame';

interface PlatformMetric { platform: string; mentions: number; }

export const PlatformBreakdownWidget: React.FC<{id:string; onRemove?: (id:string)=>void;}> = ({id,onRemove}) => {
  const [data,setData]=React.useState<PlatformMetric[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState<string|null>(null);

  const load = React.useCallback(()=>{
    setLoading(true); setError(null);
    fetch('/api/v1/monitoring/dashboard')
      .then(r=>r.json())
      .then(json=>{
        interface RawPB { platform: string; mention_count?: number }
        const raw: RawPB[] = json?.platform_breakdown || [];
        const d = raw.map(p=>({ platform: p.platform, mentions: p.mention_count || 0 }));
        setData(d);
      })
      .catch(e=> setError(e.message))
      .finally(()=> setLoading(false));
  },[]);

  React.useEffect(()=>{load();},[load]);

  return (
    <WidgetFrame id={id} title="Platforms" onRemove={onRemove} loading={loading} error={error} onRefresh={load}>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {data.map(p=> (
          <div key={p.platform} className="p-2 rounded bg-black/30 border border-white/5 flex flex-col items-start">
            <span className="uppercase text-[9px] text-white/40">{p.platform}</span>
            <span className="text-white/90 font-semibold">{p.mentions}</span>
          </div>
        ))}
        {!loading && data.length===0 && <div className="col-span-2 text-white/40 text-xs">No data</div>}
      </div>
    </WidgetFrame>
  );
};
