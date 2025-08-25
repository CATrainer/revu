"use client";
import React from 'react';
import useSWR from 'swr';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { API_URL } from '../api-url';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function DashboardPage() {
  const params = new URLSearchParams(typeof window!=='undefined'?window.location.search:"");
  const user_id = params.get('user_id');
  const { data } = useSWR(user_id ? API_URL + "/dashboard/stats?user_id="+user_id : null, fetcher);
  const { data: rep } = useSWR(user_id ? `${API_URL}/reputation/score?user_id=${user_id}` : null, fetcher);
  const { data: alerts } = useSWR(user_id ? `${API_URL}/reputation/alerts?user_id=${user_id}` : null, fetcher);
  const { data: trend } = useSWR(user_id ? `${API_URL}/reputation/trend?user_id=${user_id}&days=7` : null, fetcher);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {!data && <p>Loading...</p>}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          <div className="p-4 bg-white border rounded">Profiles: {data.profiles}</div>
          <div className="p-4 bg-white border rounded">Uploads: {data.uploads}</div>
          <div className="p-4 bg-white border rounded">Comments: {data.comments}</div>
          <div className="p-4 bg-white border rounded">
            <div className="text-xs text-gray-600">Reputation (24h)</div>
            <div className="text-2xl font-semibold">{rep?.score ?? '—'}</div>
            <div className={`text-xs ${rep?.trend>=0?'text-green-600':'text-red-600'}`}>{rep ? ((rep.trend>=0?'+':'')+rep.trend) : ''}</div>
            <div className="h-10 mt-2">
              {trend && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <Line type="monotone" dataKey="score" stroke="#0ea5e9" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="mt-4 text-lg font-medium">Alerts</h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {(alerts?.length ? alerts : []).slice(0,3).map((a:any, i:number)=> (
            <div key={i} className="p-3 border rounded bg-white text-sm">
              <span className="font-semibold mr-1">{a.type}</span>
              <span>{a.message}</span>
            </div>
          ))}
          {!alerts?.length && <div className="text-sm text-gray-500">No active alerts</div>}
        </div>
      </div>
    </div>
  );
}
