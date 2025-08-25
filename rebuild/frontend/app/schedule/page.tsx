"use client";
import React from 'react';
import useSWR from 'swr';
import { API_URL } from '../api-url';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function SchedulePage() {
  const params = new URLSearchParams(typeof window!=='undefined'?window.location.search:"" );
  const user_id = params.get('user_id');
  const { data: ideas } = useSWR(user_id ? `${API_URL}/ideas?user_id=${user_id}` : null, fetcher);
  const { data: sched, mutate } = useSWR(user_id ? `${API_URL}/schedule?user_id=${user_id}` : null, fetcher);
  const [ideaId, setIdeaId] = React.useState<string|undefined>(undefined);
  const [platform, setPlatform] = React.useState('youtube');
  const [caption, setCaption] = React.useState('');
  const [when, setWhen] = React.useState<string>('');
  const [bulk, setBulk] = React.useState<Array<{idea_id?: string, platform: string, caption?: string, scheduled_at: string}>>([]);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(100);
  const { data: schedPaged, mutate: mutateSchedPaged } = useSWR(user_id ? `${API_URL}/schedule?user_id=${user_id}&page=${page}&page_size=${size}` : null, fetcher);

  async function prepare() {
    if (!user_id || !ideaId) return;
    const res = await fetch(`${API_URL}/ideas/prepare`, {
      method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, idea_id: ideaId })
    });
    const data = await res.json();
    setCaption(data.caption || '');
  }

  async function create() {
    if (!user_id || !when) return;
    await fetch(`${API_URL}/schedule/create`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, idea_id: ideaId, platform, caption, scheduled_at: when })
    });
    setCaption(''); setWhen('');
    mutate();
    mutateSchedPaged();
  }

  function addBulkRow() {
    setBulk(b=>[...b, { platform: 'youtube', scheduled_at: '' }]);
  }

  async function createBulk() {
    if (!user_id) return;
    const items = bulk.map(b=>({ idea_id: b.idea_id || undefined, platform: b.platform, caption: b.caption || undefined, scheduled_at: b.scheduled_at }));
    if (!items.length) return;
    await fetch(`${API_URL}/schedule/bulk-create`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, items }) });
    setBulk([]);
    mutate();
    mutateSchedPaged();
  }

  async function publish(id: string) {
    if (!user_id) return;
    await fetch(`${API_URL}/schedule/${id}/publish?user_id=${user_id}`, { method:'POST' });
    mutate();
    mutateSchedPaged();
  }

  async function remove(id: string) {
    if (!user_id) return;
    await fetch(`${API_URL}/schedule/${id}?user_id=${user_id}`, { method:'DELETE' });
    mutate();
    mutateSchedPaged();
  }

  async function exportSched(format: 'ics'|'csv') {
    if (!user_id) return;
    const res = await fetch(`${API_URL}/schedule/export?user_id=${user_id}&format=${format}`);
    const data = await res.json();
    const blob = new Blob([data.text||''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = format==='ics' ? 'schedule.ics' : 'schedule.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Schedule</h1>

      <div className="border rounded p-4 bg-white grid grid-cols-4 gap-3 items-end">
        <div className="col-span-1">
          <label className="block text-xs text-gray-600">Idea (optional)</label>
          <select value={ideaId||''} onChange={e=>setIdeaId(e.target.value||undefined)} className="w-full border rounded px-2 py-1 text-sm">
            <option value="">— none —</option>
            {(ideas||[]).map((i:any)=>(<option key={i.id} value={i.id}>{i.title}</option>))}
          </select>
        </div>
        <div className="col-span-1">
          <label className="block text-xs text-gray-600">Platform</label>
          <select value={platform} onChange={e=>setPlatform(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter</option>
          </select>
        </div>
        <div className="col-span-1">
          <label className="block text-xs text-gray-600">When</label>
          <input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div className="col-span-1">
          <label className="block text-xs text-gray-600">Caption</label>
          <textarea value={caption} onChange={e=>setCaption(e.target.value)} className="w-full border rounded px-2 py-1 text-sm h-[62px]" />
        </div>
        <div className="col-span-4 flex gap-2">
          <button onClick={prepare} className="px-3 py-1 border rounded text-sm">Prepare From Idea</button>
          <button onClick={create} className="px-3 py-1 border rounded text-sm">Schedule</button>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Bulk Schedule</div>
          <button onClick={addBulkRow} className="text-xs px-2 py-1 border rounded">Add Row</button>
        </div>
        <div className="space-y-2">
          {bulk.map((row, idx)=> (
            <div key={idx} className="grid grid-cols-4 gap-2 items-end">
              <select value={row.idea_id||''} onChange={e=>setBulk(list=>{const n=[...list]; n[idx] = { ...n[idx], idea_id: e.target.value||undefined }; return n;})} className="border rounded px-2 py-1 text-sm">
                <option value="">— idea —</option>
                {(ideas||[]).map((i:any)=>(<option key={i.id} value={i.id}>{i.title}</option>))}
              </select>
              <select value={row.platform} onChange={e=>setBulk(list=>{const n=[...list]; n[idx] = { ...n[idx], platform: e.target.value }; return n;})} className="border rounded px-2 py-1 text-sm">
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="twitter">Twitter</option>
              </select>
              <input type="datetime-local" value={row.scheduled_at} onChange={e=>setBulk(list=>{const n=[...list]; n[idx] = { ...n[idx], scheduled_at: e.target.value }; return n;})} className="border rounded px-2 py-1 text-sm" />
              <input placeholder="optional caption" value={row.caption||''} onChange={e=>setBulk(list=>{const n=[...list]; n[idx] = { ...n[idx], caption: e.target.value }; return n;})} className="border rounded px-2 py-1 text-sm" />
            </div>
          ))}
        </div>
        {bulk.length>0 && (
          <div className="mt-2">
            <button onClick={createBulk} className="text-xs px-2 py-1 border rounded">Create {bulk.length} Scheduled</button>
          </div>
        )}
      </div>

      <div className="border rounded p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Scheduled</div>
          <div className="space-x-2">
            <button onClick={()=>exportSched('ics')} className="text-xs px-2 py-1 border rounded">Export ICS</button>
            <button onClick={()=>exportSched('csv')} className="text-xs px-2 py-1 border rounded">Export CSV</button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="space-x-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded">Prev</button>
            <span>Page {page}</span>
            <button onClick={()=>setPage(p=>p+1)} className="px-2 py-1 border rounded">Next</button>
          </div>
          <select value={size} onChange={e=>{setSize(parseInt(e.target.value)); setPage(1);}} className="border rounded px-1 py-0.5">
            {[25,50,100,150,200].map(s=>(<option key={s} value={s}>{s}/page</option>))}
          </select>
        </div>
        <div className="space-y-2">
          {(schedPaged||sched||[]).map((s:any)=>(
            <div key={s.id} className="border rounded p-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.platform} • {s.scheduled_at}</div>
                  <div className="text-xs text-gray-600">{s.caption}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-600">{s.status}</span>
                  <button onClick={()=>publish(s.id)} className="text-xs px-2 py-1 border rounded">Mark Posted</button>
                  <button onClick={()=>remove(s.id)} className="text-xs px-2 py-1 border rounded">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
