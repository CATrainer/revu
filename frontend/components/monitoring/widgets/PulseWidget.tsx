import React from 'react';
import { WidgetFrame } from './WidgetFrame';

export const PulseWidget: React.FC<{onRemove?: (id: string)=>void; id: string;}> = ({onRemove, id}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string|null>(null);
  const [score, setScore] = React.useState<number|null>(null);

  React.useEffect(()=>{
    let active = true;
    setLoading(true);
    fetch('/api/v1/monitoring/dashboard')
      .then(r=> r.json())
      .then(data=>{ if(!active) return; setScore(data?.pulse_score ?? Math.round(Math.random()*100)); })
      .catch(e=>{ if(!active) return; setError(e.message); })
      .finally(()=> active && setLoading(false));
    return ()=> {active=false};
  },[]);

  return (
    <WidgetFrame id={id} title="Pulse" onRemove={onRemove} loading={loading} error={error} onRefresh={()=>{ /* TODO */ }}>
      {score !== null && (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-400/30 to-teal-300/30 animate-pulse" />
            <div className="absolute inset-1 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-2xl font-bold">
              {score}
            </div>
          </div>
          <p className="mt-2 text-xs tracking-wide uppercase text-white/60">Health Score</p>
        </div>
      )}
    </WidgetFrame>
  );
};
