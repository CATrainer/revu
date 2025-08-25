"use client";
import React from 'react';
import useSWR from 'swr';
import { API_URL } from '../api-url';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function CompetitorsPage() {
  const params = new URLSearchParams(typeof window!=='undefined'?window.location.search:"" );
  const user_id = params.get('user_id');

  const { data: list, mutate } = useSWR(user_id ? `${API_URL}/competitors?user_id=${user_id}` : null, fetcher);
  const { data: insights, mutate: mutateInsights } = useSWR(user_id ? `${API_URL}/competitors/insights?user_id=${user_id}` : null, fetcher);

  const [handle, setHandle] = React.useState("");
  const [platform, setPlatform] = React.useState("youtube");

  async function addCompetitor() {
    if (!user_id || !handle) return;
    await fetch(`${API_URL}/competitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, competitor_handle: handle, platform })
    });
    setHandle("");
    mutate();
    mutateInsights();
  }

  async function removeCompetitor(id: string) {
    if (!user_id) return;
    await fetch(`${API_URL}/competitors/${id}?user_id=${user_id}`, { method: 'DELETE' });
    mutate();
    mutateInsights();
  }

  async function seedMentions() {
    if (!user_id) return;
    await fetch(`${API_URL}/competitors/seed-mentions?user_id=${user_id}`, { method: 'POST' });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Competitors</h1>

      <div className="border rounded p-4 bg-white flex gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-600">Handle</label>
          <input value={handle} onChange={e=>setHandle(e.target.value)} placeholder="@someone"
                 className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-600">Platform</label>
          <select value={platform} onChange={e=>setPlatform(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter</option>
          </select>
        </div>
        <button onClick={addCompetitor} className="px-3 py-1 border rounded text-sm">Add</button>
        <button onClick={seedMentions} className="px-3 py-1 border rounded text-sm">Seed Mentions</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Tracked</div>
          <div className="space-y-2">
            {list?.length ? list.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between border rounded p-2 text-sm">
                <div>
                  <div className="font-semibold">{c.handle}</div>
                  <div className="text-xs text-gray-600">{c.platform}</div>
                </div>
                <button onClick={()=>removeCompetitor(c.id)} className="text-xs px-2 py-1 border rounded">Remove</button>
              </div>
            )) : <div className="text-xs text-gray-500">No competitors yet</div>}
          </div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Insights</div>
          <div className="space-y-3">
            {insights?.length ? insights.map((i:any, idx:number) => (
              <div key={idx} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{i.handle}</div>
                  <div className="text-xs text-gray-600">{i.platform}</div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-600">Reputation</div>
                    <div className="font-semibold">{i.reputation_score}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Posts/week</div>
                    <div className="font-semibold">{i.posting_cadence_per_week}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Avg engagement</div>
                    <div className="font-semibold">{i.avg_engagement}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-gray-600 mb-1">Top themes</div>
                  <div className="flex flex-wrap gap-1">
                    {i.top_themes?.map((t:string)=> <span key={t} className="text-xs px-2 py-0.5 rounded bg-slate-100">{t}</span>)}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-gray-600 mb-1">Recent highlights</div>
                  <ul className="list-disc pl-4 text-xs space-y-1">
                    {i.recent_highlights?.map((h:string, j:number)=> <li key={j}>{h}</li>)}
                  </ul>
                </div>
              </div>
            )) : <div className="text-xs text-gray-500">No insights yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
