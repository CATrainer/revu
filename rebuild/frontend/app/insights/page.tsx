"use client";
import React from 'react';
import useSWR from 'swr';
import { API_URL } from '../api-url';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function InsightsPage() {
  const params = new URLSearchParams(typeof window!=='undefined'?window.location.search:"" );
  const user_id = params.get('user_id');

  const { data: topics } = useSWR(user_id ? `${API_URL}/competitors/topics?user_id=${user_id}` : null, fetcher);
  const { data: posts } = useSWR(user_id ? `${API_URL}/competitors/top-posts?user_id=${user_id}` : null, fetcher);
  const { data: opps } = useSWR(user_id ? `${API_URL}/competitors/opportunities?user_id=${user_id}` : null, fetcher);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Insights</h1>

      <div className="border rounded p-4 bg-white">
        <div className="text-sm text-gray-600 mb-2">Competitor Topics</div>
        <div className="flex flex-wrap gap-2">
          {topics?.topics?.length ? topics.topics.map((t:string)=>(
            <span key={t} className="text-xs px-2 py-1 rounded bg-slate-100">{t}</span>
          )) : <div className="text-xs text-gray-500">—</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Top Competitor Posts</div>
          <div className="space-y-2">
            {posts?.length ? posts.map((p:any, i:number)=>(
              <div key={i} className="border rounded p-2 text-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-gray-600">{p.platform} • {p.handle}</div>
                </div>
                <div className="text-xs">{p.engagement} eng.</div>
              </div>
            )) : <div className="text-xs text-gray-500">—</div>}
          </div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Opportunities</div>
          <div className="space-y-2">
            {opps?.length ? opps.map((o:any, i:number)=>(
              <div key={i} className="border rounded p-2 text-sm flex items-center justify-between">
                <div>{o.topic}</div>
                <div className="text-xs text-gray-600">{o.competitor_support} comps</div>
              </div>
            )) : <div className="text-xs text-gray-500">—</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
