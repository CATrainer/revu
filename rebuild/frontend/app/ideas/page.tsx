"use client";
import React from 'react';
import useSWR from 'swr';
import { API_URL } from '../api-url';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function IdeasPage() {
  const params = new URLSearchParams(typeof window!=='undefined'?window.location.search:"" );
  const user_id = params.get('user_id');

  const { data: ideas, mutate } = useSWR(user_id ? `${API_URL}/ideas?user_id=${user_id}` : null, fetcher);
  const cols = ['backlog','shortlist','drafted','posted'];
  const grouped = React.useMemo(()=>{
    const g: Record<string, any[]> = { backlog:[], shortlist:[], drafted:[], posted:[] };
    (ideas||[]).forEach((i:any)=>{ g[i.status||'backlog'].push(i); });
    return g;
  }, [ideas]);
  const { data: briefs, mutate: mutateBriefs } = useSWR(user_id ? `${API_URL}/briefs?user_id=${user_id}` : null, fetcher);

  const [count, setCount] = React.useState(10);
  const [draft, setDraft] = React.useState<{caption?: string, titles?: string[]}>({});
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(50);
  const { data: ideasPaged, mutate: mutateIdeasPaged } = useSWR(user_id ? `${API_URL}/ideas?user_id=${user_id}&page=${page}&page_size=${size}` : null, fetcher);

  async function generateIdeas() {
    if (!user_id) return;
    await fetch(`${API_URL}/ideas/generate`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ user_id, count })
    });
    mutate();
    mutateIdeasPaged();
  }

  async function batchPrepare() {
    if (!user_id) return;
    const ids = Object.keys(selected).filter(k=>selected[k]);
    if (!ids.length) return;
    await fetch(`${API_URL}/ideas/prepare-batch`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, ids }) });
    alert('Prepared drafts for selected ideas');
  }

  async function setStatus(id: string, status: string) {
    if (!user_id) return;
    await fetch(`${API_URL}/ideas/${id}/status?user_id=${user_id}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status })
    });
    mutate();
    mutateIdeasPaged();
  }

  async function delIdea(id: string) {
    if (!user_id) return;
    await fetch(`${API_URL}/ideas/${id}?user_id=${user_id}`, { method:'DELETE' });
    mutate();
    mutateIdeasPaged();
  }

  async function makeBrief(idea_id: string) {
    if (!user_id) return;
    await fetch(`${API_URL}/briefs/generate`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, idea_id })
    });
    mutateBriefs();
    mutateIdeasPaged();
  }

  async function draftCaption(idea?: string, brief?: string) {
    if (!user_id) return;
    const r = await fetch(`${API_URL}/assistant/caption`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, idea, brief })
    });
    const data = await r.json();
    setDraft(d => ({ ...d, caption: data.text }));
  }

  async function draftTitles(idea?: string) {
    const r = await fetch(`${API_URL}/assistant/titles`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, idea })
    });
    const data = await r.json();
    setDraft(d => ({ ...d, titles: data.titles }));
  }

  function briefsFor(ideaId: string) {
    return (briefs || []).filter((b:any)=> b.idea_id === ideaId);
  }

  const ideasList = ideasPaged || ideas || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ideas</h1>

      <div className="border rounded p-4 bg-white flex items-end gap-2">
        <div>
          <label className="block text-xs text-gray-600">Generate</label>
          <input type="number" min={1} max={50} value={count} onChange={e=>setCount(parseInt(e.target.value||'10'))} className="w-24 border rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={generateIdeas} className="px-3 py-1 border rounded text-sm">Create Ideas</button>
        <button onClick={batchPrepare} className="px-3 py-1 border rounded text-sm">Prepare Selected</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="space-x-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded">Prev</button>
              <span>Page {page}</span>
              <button onClick={()=>setPage(p=>p+1)} className="px-2 py-1 border rounded">Next</button>
            </div>
            <select value={size} onChange={e=>{setSize(parseInt(e.target.value)); setPage(1);}} className="border rounded px-1 py-0.5">
              {[25,50,100,150,200].map(s=>(<option key={s} value={s}>{s}/page</option>))}
            </select>
          </div>
      {(ideasList).map((i:any) => (
            <div key={i.id} className="border rounded p-3 bg-white">
              <div className="flex items-center justify-between">
        <div className="font-semibold text-sm flex items-center gap-2"><input type="checkbox" checked={!!selected[i.id]} onChange={e=>setSelected(s=>({...s,[i.id]:e.target.checked}))} /> {i.title}</div>
                <div className="text-xs text-gray-600">{i.status}</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <button onClick={()=>setStatus(i.id,'shortlist')} className="px-2 py-1 border rounded">Shortlist</button>
                <button onClick={()=>setStatus(i.id,'drafted')} className="px-2 py-1 border rounded">Mark Drafted</button>
                <button onClick={()=>makeBrief(i.id)} className="px-2 py-1 border rounded">Brief</button>
                <button onClick={()=>draftCaption(i.title)} className="px-2 py-1 border rounded">Draft Caption</button>
                <button onClick={()=>draftTitles(i.title)} className="px-2 py-1 border rounded">Draft Titles</button>
                <button onClick={()=>delIdea(i.id)} className="px-2 py-1 border rounded">Delete</button>
              </div>
              <div className="mt-2 text-xs text-gray-600">Briefs: {briefsFor(i.id).length}</div>
              {briefsFor(i.id).slice(0,1).map((b:any)=>(
                <pre key={b.id} className="mt-2 bg-slate-50 p-2 rounded text-xs whitespace-pre-wrap">{b.content}</pre>
              ))}
            </div>
          ))}
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-1">Assistant Drafts</div>
          <div className="text-xs">
            <div className="mb-2">
              <div className="font-semibold">Caption</div>
              <div className="mt-1 border rounded p-2 min-h-[3rem]">{draft.caption || '—'}</div>
            </div>
            <div>
              <div className="font-semibold">Titles</div>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                {(draft.titles || []).map((t, i)=>(<li key={i}>{t}</li>))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <div className="text-sm text-gray-600 mb-2">Board</div>
        <div className="grid grid-cols-4 gap-3">
          {cols.map(col => (
            <div key={col} className="border rounded p-2 min-h-[200px]">
              <div className="text-xs font-semibold uppercase mb-2">{col}</div>
              <div
                onDragOver={(e)=>e.preventDefault()}
                onDrop={async (e)=>{
                  const id = e.dataTransfer.getData('text/plain');
                  if (!id || !user_id) return;
                  await fetch(`${API_URL}/ideas/${id}/status?user_id=${user_id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: col })});
                  mutate();
                }}
                className="space-y-2"
              >
                {(grouped[col]||[]).map((i:any)=>(
                  <div key={i.id}
                       draggable
                       onDragStart={(e)=> e.dataTransfer.setData('text/plain', i.id)}
                       className="border rounded p-2 text-sm bg-white">
                    {i.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
