"use client";
import React from 'react';
import useSWR from 'swr';
import { API_URL } from '../api-url';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useToast } from '../../components/Toast';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function SocialsPage() {
  const params = new URLSearchParams(typeof window!=='undefined'?window.location.search:"");
  const user_id = params.get('user_id');
  const { push } = useToast();
  const { data: score } = useSWR(user_id ? `${API_URL}/reputation/score?user_id=${user_id}` : null, fetcher, { refreshInterval: 30000 });
  const { data: trend } = useSWR(user_id ? `${API_URL}/reputation/trend?user_id=${user_id}` : null, fetcher, { refreshInterval: 120000 });
  const { data: summary } = useSWR(user_id ? `${API_URL}/reputation/summary?user_id=${user_id}` : null, fetcher, { refreshInterval: 300000 });
  const { data: alerts, mutate: mutateAlerts } = useSWR(user_id ? `${API_URL}/reputation/alerts?user_id=${user_id}` : null, fetcher, { refreshInterval: 30000 });
  const { data: themes } = useSWR(user_id ? `${API_URL}/social/themes?user_id=${user_id}` : null, fetcher, { refreshInterval: 300000 });
  const { data: mentions, mutate: mutateMentions } = useSWR(user_id ? `${API_URL}/social/mentions?user_id=${user_id}&page=1&page_size=50` : null, fetcher, { refreshInterval: 30000 });
  const { data: sources } = useSWR(user_id ? `${API_URL}/social/sources?user_id=${user_id}` : null, fetcher, { refreshInterval: 300000 });
  const { data: mtrend } = useSWR(user_id ? `${API_URL}/social/mentions-trend?user_id=${user_id}` : null, fetcher, { refreshInterval: 120000 });
  const { data: watch } = useSWR(user_id ? `${API_URL}/social/watch-hits?user_id=${user_id}` : null, fetcher, { refreshInterval: 120000 });
  const { data: compare } = useSWR(user_id ? `${API_URL}/reputation/compare?user_id=${user_id}` : null, fetcher, { refreshInterval: 120000 });
  const { data: scorecard } = useSWR(user_id ? `${API_URL}/reputation/scorecard?user_id=${user_id}` : null, fetcher, { refreshInterval: 300000 });
  const { data: settings, mutate: mutateSettings } = useSWR(user_id ? `${API_URL}/users/settings?user_id=${user_id}` : null, fetcher);
  const [watchInput, setWatchInput] = React.useState("");
  const [mentionsPage, setMentionsPage] = React.useState(1);
  const [mentionsSize, setMentionsSize] = React.useState(50);
  const { data: mentionsPaged, mutate: mutateMentionsPaged } = useSWR(user_id ? `${API_URL}/social/mentions?user_id=${user_id}&page=${mentionsPage}&page_size=${mentionsSize}` : null, fetcher, { refreshInterval: 30000 });

  async function seedMentions() {
    if (!user_id) return;
    try {
      await fetch(`${API_URL}/social/seed-mentions?user_id=${user_id}`, { method:'POST' })
      mutateMentions();
      mutateMentionsPaged();
      mutateAlerts();
      push({ kind:'success', text:'Mentions seeded' });
    } catch (e:any) {
      push({ kind:'error', text:'Failed to seed mentions' });
    }
  }

  async function exportReport() {
    if (!user_id) return;
    try {
      const res = await fetch(`${API_URL}/social/report?user_id=${user_id}`, { method: 'POST' });
      const data = await res.json();
      const blob = new Blob([data.text || ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'reputation_report.txt'; a.click();
      URL.revokeObjectURL(url);
      push({ kind:'success', text:'Report downloaded' });
    } catch (e:any) {
      push({ kind:'error', text:'Export failed' });
    }
  }

  async function deleteMention(id: string) {
    if (!user_id) return;
    try {
      await fetch(`${API_URL}/social/mentions/${id}?user_id=${user_id}`, { method: 'DELETE' });
      mutateMentions();
      mutateMentionsPaged();
      push({ kind:'success', text:'Deleted' });
    } catch (e:any) {
      push({ kind:'error', text:'Delete failed' });
    }
  }

  React.useEffect(()=>{
    if (settings?.watch_keywords) {
      try { setWatchInput((settings.watch_keywords as string[]).join(', ')); } catch {}
    }
  }, [settings]);

  async function saveWatch() {
    if (!user_id) return;
    const keywords = watchInput.split(',').map(s=>s.trim()).filter(Boolean);
    const next = { ...(settings||{}), watch_keywords: keywords };
    try {
      await fetch(`${API_URL}/users/settings`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, settings: next })});
      mutateSettings();
      push({ kind:'success', text:'Watchlist saved' });
    } catch (e:any) {
      push({ kind:'error', text:'Save failed' });
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reputation & Socials</h1>
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 border rounded p-4 bg-white">
          <div className="text-sm text-gray-600">Reputation Score (24h)</div>
          <div className="text-4xl font-bold">{score?.score ?? '—'}</div>
          <div className={`text-sm ${score?.trend>=0?'text-green-600':'text-red-600'}`}>{score? (score.trend>=0?'+':'')+score.trend : ''}</div>
        </div>
        <div className="col-span-3 border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Sentiment Trend</div>
          <div className="h-48">
            {trend && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[0,100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#0ea5e9" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Narrative summary</div>
          <p className="text-sm">{summary?.summary ?? '—'}</p>
        </div>
        <div className="col-span-1 border rounded p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Alerts</div>
            <div className="space-x-2">
              <button className="text-xs px-2 py-1 border rounded" onClick={seedMentions}>Seed Mentions</button>
              <button className="text-xs px-2 py-1 border rounded" onClick={exportReport}>Export Report</button>
            </div>
          </div>
          <div className="space-y-2">
            {alerts?.length ? alerts.map((a:any, i:number)=> (
              <div key={i} className="text-xs p-2 rounded border">
                <span className="font-semibold mr-1">{a.type}</span>
                <span>{a.message}</span>
              </div>
            )) : <div className="text-xs text-gray-500">No alerts</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-1">Top positive themes</div>
          <div className="flex flex-wrap gap-2">
            {themes?.positive?.map((t:string)=> <span key={t} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">{t}</span>)}
          </div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-1">Top negative themes</div>
          <div className="flex flex-wrap gap-2">
            {themes?.negative?.map((t:string)=> <span key={t} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">{t}</span>)}
          </div>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <div className="text-sm text-gray-600 mb-2">Watch keywords</div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-600">Comma-separated</label>
            <input className="w-full border rounded px-2 py-1 text-sm" value={watchInput} onChange={e=>setWatchInput(e.target.value)} placeholder="crisis, lawsuit, refund, outage" />
          </div>
          <button onClick={saveWatch} className="px-3 py-1 border rounded text-sm">Save</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded p-4 bg-white col-span-1">
          <div className="text-sm text-gray-600 mb-2">Sources</div>
          <ul className="text-sm space-y-1">
            {sources?.length ? sources.map((s:any, i:number)=> (
              <li key={i} className="flex justify-between"><span>{s.source}</span><span className="text-gray-600">{s.count}</span></li>
            )) : <li className="text-xs text-gray-500">—</li>}
          </ul>
        </div>
        <div className="border rounded p-4 bg-white col-span-2">
          <div className="text-sm text-gray-600 mb-2">Mentions trend</div>
          <div className="h-40">
            {mtrend && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mtrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#64748b" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Watchlist hits (7d)</div>
          <div className="space-y-2">
            {watch?.hits?.length ? watch.hits.map((h:any, i:number)=> (
              <div key={i} className="border rounded p-2 text-xs">
                <div className="flex justify-between"><span className="font-semibold">{h.keyword}</span><span>{h.count}</span></div>
                {h.samples?.length ? <ul className="list-disc pl-4 mt-1 space-y-1">{h.samples.map((s:string, j:number)=>(<li key={j}>{s}</li>))}</ul> : null}
              </div>
            )) : <div className="text-xs text-gray-500">No watch keywords configured</div>}
          </div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Compare vs Competitors (24h)</div>
          <div className="text-sm">
            {compare ? (
              <div className="space-y-1">
                <div>You: <span className="font-semibold">{compare.you.score}</span> <span className="text-xs text-gray-600">(n={compare.you.n})</span></div>
                <div>Competitors: <span className="font-semibold">{compare.competitors.score}</span> <span className="text-xs text-gray-600">(n={compare.competitors.n})</span></div>
                <div>Delta: <span className="font-semibold">{compare.delta}</span></div>
              </div>
            ) : '—'}
          </div>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <div className="text-sm text-gray-600 mb-2">Scorecard</div>
        {scorecard ? (
          <div className="text-sm">
            <div>Share of voice: You {scorecard.share_of_voice.you}, Competitors {scorecard.share_of_voice.competitors} (<span className="font-semibold">{scorecard.share_of_voice.percent_you}%</span> you)</div>
            <div className="mt-2">Top sources: {scorecard.sources?.slice(0,5).map((s:any)=> `${s.source}(${s.count})`).join(', ')}</div>
            <div className="mt-2">Top positive themes: {scorecard.themes?.positive?.slice(0,5).join(', ')}</div>
            <div className="mt-1">Top negative themes: {scorecard.themes?.negative?.slice(0,5).join(', ')}</div>
          </div>
        ) : '—'}
      </div>
      <div className="border rounded p-4 bg-white">
        <div className="text-sm text-gray-600 mb-2 flex items-end justify-between">
          <span>Mentions</span>
          <div className="flex items-center gap-2 text-xs">
            <button disabled={mentionsPage<=1} onClick={()=>setMentionsPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded">Prev</button>
            <span>Page {mentionsPage}</span>
            <button onClick={()=>setMentionsPage(p=>p+1)} className="px-2 py-1 border rounded">Next</button>
            <select value={mentionsSize} onChange={e=>{setMentionsSize(parseInt(e.target.value)); setMentionsPage(1);}} className="border rounded px-1 py-0.5">
              {[25,50,100,150,200].map(s=>(<option key={s} value={s}>{s}/page</option>))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {(mentionsPaged||mentions)?.length ? (mentionsPaged||mentions).map((m:any)=> (
            <div key={m.id} className="border rounded p-2">
              <div className="flex items-center justify-between text-xs">
                <div className="font-semibold">{m.source}</div>
                <div className="text-gray-500">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</div>
              </div>
              <div className="text-sm mt-1">{m.text}</div>
              <div className="mt-2 text-right">
                <button onClick={()=>deleteMention(m.id)} className="text-xs px-2 py-1 border rounded">Delete</button>
              </div>
            </div>
          )) : <div className="text-xs text-gray-500">No mentions yet</div>}
        </div>
      </div>
    </div>
  )
}
