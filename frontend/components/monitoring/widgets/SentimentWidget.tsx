import React from 'react';
import { WidgetFrame } from './WidgetFrame';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Point { time: string; sentiment: number; }

export const SentimentWidget: React.FC<{id:string; onRemove?: (id:string)=>void;}> = ({id,onRemove}) => {
  const [data,setData] = React.useState<Point[]>([]);
  const [loading,setLoading] = React.useState(true);
  const [error,setError] = React.useState<string|null>(null);

  const load = React.useCallback(()=>{
    setLoading(true); setError(null);
    fetch('/api/v1/monitoring/dashboard')
      .then(r=>r.json())
      .then(json=>{
        type TimelinePoint = { bucket_start?: string; avg_sentiment?: number };
        const raw: TimelinePoint[] = json?.sentiment_timeline || [];
        const series = raw.map(p=>({ time: p.bucket_start?.slice(5,16) ?? '', sentiment: p.avg_sentiment ?? 0 }));
        setData(series);
      })
      .catch(e=> setError(e.message))
      .finally(()=> setLoading(false));
  },[]);

  React.useEffect(()=>{load();},[load]);

  return (
    <WidgetFrame id={id} title="Sentiment" onRemove={onRemove} loading={loading} error={error} onRefresh={load}>
      {data.length>0 && (
        <div className="h-40 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="time" hide />
              <YAxis domain={[-1,1]} hide />
              <Tooltip contentStyle={{background:'rgba(0,0,0,0.6)', border:'none'}} />
              <Line type="monotone" dataKey="sentiment" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetFrame>
  );
};
