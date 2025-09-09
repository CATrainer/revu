import React from 'react';
import { WidgetFrame } from './WidgetFrame';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CompetitorPoint { name: string; score: number; }

export const CompetitorsWidget: React.FC<{id:string; onRemove?: (id:string)=>void;}> = ({id,onRemove}) => {
  const [data,setData]=React.useState<CompetitorPoint[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState<string|null>(null);

  const load = React.useCallback(()=>{
    setLoading(true); setError(null);
    fetch('/api/v1/monitoring/competitors/compare')
      .then(r=>r.json())
      .then(json=>{
        interface RawCompetitor { name?: string; sentiment?: number }
        const raw: RawCompetitor[] = json?.competitors || [];
        const d = raw.map(c=>({ name: c.name?.slice(0,8) || 'Comp', score: c.sentiment || 0 }));
        setData(d);
      })
      .catch(e=> setError(e.message))
      .finally(()=> setLoading(false));
  },[]);

  React.useEffect(()=>{load();},[load]);

  return (
    <WidgetFrame id={id} title="Competitors" onRemove={onRemove} loading={loading} error={error} onRefresh={load}>
      {data.length>0 && (
        <div className="h-40 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#bbb' : '#555'} fontSize={10} />
              <YAxis hide />
              <Tooltip contentStyle={{background:'rgba(0,0,0,0.65)', border:'none', borderRadius:6, padding:8}} />
              <Bar dataKey="score" fill="#10b981" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetFrame>
  );
};
