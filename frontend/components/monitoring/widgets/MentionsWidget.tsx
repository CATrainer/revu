import React from 'react';
import { WidgetFrame } from './WidgetFrame';

interface Mention { id: string; text: string; platform: string; created_at: string; }

export const MentionsWidget: React.FC<{id:string; onRemove?: (id:string)=>void;}> = ({id,onRemove}) => {
  const [items,setItems]=React.useState<Mention[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState<string|null>(null);
  const [page,setPage]=React.useState(1);
  const [hasMore,setHasMore]=React.useState(true);
  const ref = React.useRef<HTMLDivElement|null>(null);

  const load = React.useCallback((p=1)=>{
    if(!hasMore && p!==1) return;
    setLoading(true); setError(null);
    fetch(`/api/v1/monitoring/mentions?limit=10&page=${p}`)
      .then(r=>r.json())
      .then(json=>{
        const newItems = p===1 ? (json?.items || []) : [...items, ...(json?.items || [])];
        setItems(newItems);
        setHasMore((json?.items || []).length>0);
        setPage(p);
      })
      .catch(e=> setError(e.message))
      .finally(()=> setLoading(false));
  },[items,hasMore]);

  React.useEffect(()=>{load(1);},[load]);

  React.useEffect(()=>{
    const el = ref.current; if(!el) return;
    const onScroll = ()=>{
      if(el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        load(page+1);
      }
    };
    el.addEventListener('scroll', onScroll);
    return ()=> el.removeEventListener('scroll', onScroll);
  },[load,page]);

  return (
    <WidgetFrame id={id} title="Mentions" onRemove={onRemove} loading={loading && page===1} error={error} onRefresh={()=> load(1)}>
      <div ref={ref} className="h-44 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {items.map(m=> (
          <div key={m.id} className="text-[11px] p-2 rounded bg-black/30 border border-white/5">
            <div className="flex items-center justify-between mb-1 text-[10px] text-white/40">
              <span>{m.platform}</span>
              <span>{new Date(m.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-white/80 leading-snug line-clamp-3">{m.text}</p>
          </div>
        ))}
        {loading && page>1 && <div className="text-[10px] text-white/40">Loading...</div>}
        {!loading && items.length===0 && <div className="text-xs text-white/40">No mentions</div>}
      </div>
    </WidgetFrame>
  );
};
