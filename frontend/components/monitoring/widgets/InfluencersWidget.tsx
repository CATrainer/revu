import React from 'react';
import { WidgetFrame } from './WidgetFrame';

interface Influencer { handle: string; impact: number; }

export const InfluencersWidget: React.FC<{id:string; onRemove?: (id:string)=>void;}> = ({id,onRemove}) => {
  const [data,setData]=React.useState<Influencer[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState<string|null>(null);

  const load = React.useCallback(()=>{
    setLoading(true); setError(null);
    fetch('/api/v1/monitoring/dashboard')
      .then(r=>r.json())
      .then(json=>{
        interface RawInfluencer { handle?: string; name?: string; score?: number; impact?: number }
        const raw: RawInfluencer[] = json?.influencers || [];
        const items = raw.map(i=>({ handle: i.handle || i.name || 'user', impact: i.score || i.impact || 0 })).slice(0,8);
        setData(items);
      })
      .catch(e=> setError(e.message))
      .finally(()=> setLoading(false));
  },[]);

  React.useEffect(()=>{load();},[load]);

  return (
    <WidgetFrame id={id} title="Influencers" onRemove={onRemove} loading={loading} error={error} onRefresh={load}>
      <ul className="space-y-1 text-[11px]">
        {data.map((d,i)=>(
          <li key={i} className="flex items-center justify-between">
            <span className="truncate">@{d.handle}</span>
            <span className="text-white/50">{d.impact}</span>
          </li>
        ))}
        {!loading && data.length===0 && <li className="text-white/40">No data</li>}
      </ul>
    </WidgetFrame>
  );
};
