"use client";
import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { API_URL } from '../api-url';
import { useToast } from '../../components/Toast';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

function SentimentBadge({ s }: { s: string }) {
  const className = s==='positive' ? 'bg-green-100 text-green-700' : s==='negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
  return <span className={`text-xs px-2 py-1 rounded ${className}`}>{s||'neutral'}</span>
}

export default function CommentsPage() {
  const params = new URLSearchParams(typeof window!=='undefined'?window.location.search:"");
  const user_id = params.get('user_id');
  const { push } = useToast();
  const { data: uploads } = useSWR(user_id ? API_URL + "/uploads?user_id="+user_id : null, fetcher);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: comments, mutate } = useSWR(selected ? API_URL + "/comments/"+selected : null, fetcher);
  const [filter, setFilter] = useState('all');
  const [templates, setTemplates] = useState<any[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [groupMode, setGroupMode] = useState(false);
  const [groupKey, setGroupKey] = useState('');
  const { data: groupComments, mutate: mutateGroup } = useSWR(groupMode && user_id && groupKey ? `${API_URL}/comments/group?user_id=${user_id}&dedupe_key=${groupKey}` : null, fetcher);
  const [upPage, setUpPage] = useState(1);
  const [upSize, setUpSize] = useState(50);
  const { data: uploadsPaged } = useSWR(user_id ? `${API_URL}/uploads?user_id=${user_id}&page=${upPage}&page_size=${upSize}` : null, fetcher);
  const [cPage, setCPage] = useState(1);
  const [cSize, setCSize] = useState(100);
  const { data: commentsPaged, mutate: mutateCommentsPaged } = useSWR(selected ? `${API_URL}/comments/${selected}?page=${cPage}&page_size=${cSize}` : null, fetcher);

  useEffect(()=>{
    if (!user_id) return;
    fetch(API_URL+`/templates?user_id=${user_id}`).then(r=>r.json()).then(setTemplates)
  },[user_id])

  const [newTpl, setNewTpl] = useState({ name: '', text: '' })
  const [settings, setSettings] = useState<any>({})
  useEffect(()=>{
    if (!user_id) return;
    fetch(API_URL+`/users/settings?user_id=${user_id}`).then(r=>r.json()).then(setSettings)
  },[user_id])

  const groups = useMemo(()=>{
    const map: Record<string, any[]> = {};
    const ups = uploadsPaged || uploads || [];
    if (!ups) return map;
    for (const u of ups) {
      const key = u.dedupe_key || u.title;
      if (!map[key]) map[key] = [];
      map[key].push(u);
    }
    return map;
  }, [uploads, uploadsPaged]);

  async function reply(commentId: string, ai=false) {
    let text = ''
    if (ai) {
      const ar = await fetch(API_URL+"/ai/generate-response", { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ comment_text: comments.find((c:any)=>c.id===commentId).text }) }).then(r=>r.json())
      text = ar.text
    } else {
      const t = prompt('Reply text');
      if (!t) return; text = t;
    }
    try {
      await fetch(API_URL+"/comments/"+commentId+"/reply", { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text, ai_generated: ai }) })
      mutate();
      push({ kind:'success', text:'Replied' });
    } catch (e:any) {
      push({ kind:'error', text:'Reply failed' });
    }
  }

  const filtered = useMemo(()=>{
    const list = groupMode ? (groupComments||[]) : ((commentsPaged || comments) || []);
    if (filter==='all') return (commentsPaged || comments);
    if (filter==='unreplied') return list.filter((c:any)=>!c.replied);
    if (filter==='negative') return list.filter((c:any)=>c.sentiment==='negative');
    return list;
  },[comments, commentsPaged, groupComments, groupMode, filter]);

  async function bulk(action: string, text?: string) {
    const ids = Object.entries(checked).filter(([id,v])=>v).map(([id])=>id)
    if (ids.length===0) { alert('Select comments'); return }
    try {
      await fetch(API_URL+`/comments/bulk`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids, action, text }) })
      setChecked({});
      mutate();
      push({ kind:'success', text:'Bulk action applied' });
    } catch (e:any) {
      push({ kind:'error', text:'Bulk action failed' });
    }
  }

  async function runAutomation() {
    if (!user_id) return;
    try {
      await fetch(API_URL+`/automation/run?user_id=${user_id}`, { method:'POST' });
      groupMode ? mutateGroup() : mutate();
      push({ kind:'success', text:'Automation ran' });
    } catch (e:any) {
      push({ kind:'error', text:'Automation failed' });
    }
  }

  async function learnVoice() {
    if (!user_id) return;
    try {
      await fetch(API_URL+`/voice/learn`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id }) })
      push({ kind:'success', text:'Voice updated' });
    } catch (e:any) {
      push({ kind:'error', text:'Voice learn failed' });
    }
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1 space-y-3">
        <h2 className="font-semibold">Uploads</h2>
        {!uploads && <p>Loading uploads…</p>}
        {Object.entries(groups).map(([k, list]: any)=> (
          <div key={k} className="border rounded">
            <div className="px-3 py-2 bg-gray-50 text-sm font-medium">{k}</div>
            <ul>
              {list.map((u:any)=> (
                <li key={u.id} className={`px-3 py-2 text-sm flex items-center justify-between ${selected===u.id?'bg-black text-white':''}`}>
                  <button onClick={()=>setSelected(u.id)}>{u.platform}: {u.title}</button>
                  <span className="text-xs">{new Date(u.posted_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="border rounded p-3">
          <div className="text-sm font-semibold mb-2">Response Templates</div>
          <div className="space-y-2">
            {templates.map(t=> (
              <div key={t.id} className="text-xs flex items-center justify-between">
                <span className="truncate max-w-[160px]" title={t.text}>{t.name}</span>
                <button className="border px-2 py-0.5 rounded" onClick={async()=>{ await fetch(API_URL+`/templates/${t.id}`, { method:'DELETE' }); setTemplates(templates.filter(x=>x.id!==t.id)) }}>Delete</button>
              </div>
            ))}
            <input className="w-full border p-1 text-xs" placeholder="Template name" value={newTpl.name} onChange={e=>setNewTpl({...newTpl,name:e.target.value})} />
            <textarea className="w-full border p-1 text-xs h-16" placeholder="Template text" value={newTpl.text} onChange={e=>setNewTpl({...newTpl,text:e.target.value})} />
            <button className="text-xs px-2 py-1 border rounded" onClick={async()=>{ if (!user_id || !newTpl.name || !newTpl.text) return; await fetch(API_URL+`/templates`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, name:newTpl.name, text:newTpl.text }) }); setNewTpl({name:'',text:''}); const t = await fetch(API_URL+`/templates?user_id=${user_id}`).then(r=>r.json()); setTemplates(t); }}>Add Template</button>
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm font-semibold mb-2">Automation</div>
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" checked={!!settings.auto_reply_positive} onChange={async e=>{ const s={...settings, auto_reply_positive:e.target.checked}; setSettings(s); await fetch(API_URL+`/users/settings`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, settings:s }) }) }} />
            Auto-reply to positive
          </label>
          <label className="text-xs block mt-2">Negative keywords (comma-separated)</label>
          <input className="w-full border p-1 text-xs" value={(settings.negative_keywords||[]).join(',')} onChange={async e=>{ const s={...settings, negative_keywords: e.target.value.split(',').map(x=>x.trim()).filter(Boolean)}; setSettings(s); await fetch(API_URL+`/users/settings`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, settings:s }) }) }} />
          <label className="text-xs block mt-2">Spam keywords (comma-separated)</label>
          <input className="w-full border p-1 text-xs" value={(settings.spam_keywords||[]).join(',')} onChange={async e=>{ const s={...settings, spam_keywords: e.target.value.split(',').map(x=>x.trim()).filter(Boolean)}; setSettings(s); await fetch(API_URL+`/users/settings`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, settings:s }) }) }} />
        </div>
      </div>
      <div className="col-span-2">
        <h2 className="font-semibold mb-2">Comments</h2>
        <div className="flex items-center gap-2 mb-3">
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="border p-1 text-sm">
            <option value="all">All</option>
            <option value="unreplied">Unreplied</option>
            <option value="negative">Negative</option>
          </select>
          <button onClick={runAutomation} className="text-xs px-2 py-1 border rounded">Run Automation</button>
          <button onClick={learnVoice} className="text-xs px-2 py-1 border rounded">Learn Voice</button>
          <label className="text-xs flex items-center gap-1 ml-2">
            <input type="checkbox" checked={groupMode} onChange={e=>{ setGroupMode(e.target.checked); setChecked({}); }} /> Group across platforms
          </label>
          {groupMode && (
            <input className="text-xs border p-1" placeholder="dedupe key (from title)" value={groupKey} onChange={e=>setGroupKey(e.target.value)} />
          )}
          {templates.length>0 && (
            <div className="ml-auto flex items-center gap-1">
              <span className="text-xs text-gray-500">Bulk with template:</span>
              {templates.slice(0,3).map(t => (
                <button key={t.id} onClick={()=>bulk('reply', t.text)} className="text-xs px-2 py-1 border rounded">{t.name}</button>
              ))}
            </div>
          )}
        </div>
        {!groupMode && !selected && <p>Select an upload.</p>}
        {!groupMode && selected && !(commentsPaged||comments) && <p>Loading comments…</p>}
        {!groupMode && selected && (commentsPaged||comments) && (
          <>
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="space-x-2">
                <button disabled={cPage<=1} onClick={()=>setCPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded">Prev</button>
                <span>Page {cPage}</span>
                <button onClick={()=>setCPage(p=>p+1)} className="px-2 py-1 border rounded">Next</button>
              </div>
              <select value={cSize} onChange={e=>{setCSize(parseInt(e.target.value)); setCPage(1);}} className="border rounded px-1 py-0.5">
                {[50,100,200,300,500].map(s=>(<option key={s} value={s}>{s}/page</option>))}
              </select>
            </div>
            <div className="space-y-2">
              {filtered.map((c:any)=> (
                <div key={c.id} className="border rounded p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!checked[c.id]} onChange={e=>setChecked(prev=>({...prev,[c.id]:e.target.checked}))} />
                      <div className="text-sm font-medium">{c.author || 'anon'}</div>
                    </div>
                    <SentimentBadge s={c.sentiment || 'neutral'} />
                  </div>
                  <p className="text-sm mt-1">{c.text}</p>
                  <div className="flex gap-2 mt-2">
                    <button className="text-xs px-2 py-1 border rounded" onClick={()=>reply(c.id,false)}>Reply</button>
                    <button className="text-xs px-2 py-1 border rounded" onClick={()=>reply(c.id,true)}>AI Reply</button>
                    <button className="text-xs px-2 py-1 border rounded" onClick={()=>bulk('flag')}>Flag</button>
                    <button className="text-xs px-2 py-1 border rounded" onClick={()=>bulk('hide')}>Hide</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {groupMode && (
          <div className="space-y-2">
            {filtered.map((c:any)=> (
              <div key={c.id} className="border rounded p-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={!!checked[c.id]} onChange={e=>setChecked(prev=>({...prev,[c.id]:e.target.checked}))} />
                    <div className="text-sm font-medium">{c.author || 'anon'}</div>
                  </div>
                  <SentimentBadge s={c.sentiment || 'neutral'} />
                </div>
                <p className="text-sm mt-1">{c.text}</p>
                <div className="flex gap-2 mt-2">
                  <button className="text-xs px-2 py-1 border rounded" onClick={()=>reply(c.id,false)}>Reply</button>
                  <button className="text-xs px-2 py-1 border rounded" onClick={()=>reply(c.id,true)}>AI Reply</button>
                  <button className="text-xs px-2 py-1 border rounded" onClick={()=>bulk('flag')}>Flag</button>
                  <button className="text-xs px-2 py-1 border rounded" onClick={()=>bulk('hide')}>Hide</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
