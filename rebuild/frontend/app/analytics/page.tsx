"use client";
import React from 'react';
import useSWR from 'swr';
import { API_URL } from '../api-url';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useToast } from '../../components/Toast';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function AnalyticsPage() {
  const params = new URLSearchParams(typeof window!=='undefined'?window.location.search:"");
  const user_id = params.get('user_id');
  const { push } = useToast();

  const [days, setDays] = React.useState(30);
  const { data: overview, isLoading: overviewLoading } = useSWR(user_id ? [`${API_URL}/analytics/overview`, { user_id, days }] : null, ([url, body]) => fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}).then(r=>r.json()), { refreshInterval: 300000 });
  const { data: score } = useSWR(user_id ? `${API_URL}/analytics/score?user_id=${user_id}&days=${days}` : null, fetcher, { refreshInterval: 300000 });
  const { data: trend } = useSWR(user_id ? `${API_URL}/reputation/trend?user_id=${user_id}&days=${Math.min(30, days)}` : null, fetcher, { refreshInterval: 300000 });
  const { data: reports, mutate: mutateReports } = useSWR(user_id ? `${API_URL}/reports?user_id=${user_id}` : null, fetcher);
  const [emailTo, setEmailTo] = React.useState("");

  async function createReport() {
    if (!user_id) return;
    try {
      await fetch(`${API_URL}/reports`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, range_days: days })});
      push({ kind:'success', text:'Report created' });
      mutateReports();
    } catch (e:any) {
      push({ kind:'error', text:'Failed to create report' });
    }
  }

  async function downloadReport(id: string, title: string) {
    if (!user_id) return;
    const res = await fetch(`${API_URL}/reports/${id}?user_id=${user_id}`);
    const data = await res.json();
    const blob = new Blob([data.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(title||'report').replace(/[^a-z0-9-_]+/gi,'_')}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportCSV(kind: 'overview'|'hours') {
    if (!user_id) return;
    try {
      const res = await fetch(`${API_URL}/analytics/export?user_id=${user_id}&days=${days}&kind=${kind}`);
      const data = await res.json();
      const blob = new Blob([data.text || ''], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = kind === 'hours' ? 'posting_hours.csv' : 'analytics_overview.csv'; a.click();
      URL.revokeObjectURL(url);
      push({ kind:'success', text:'CSV downloaded' });
    } catch (e:any) {
      push({ kind:'error', text:'Export failed' });
    }
  }

  async function emailLatest() {
    if (!user_id || !reports?.length || !emailTo) return;
    const id = reports[0].id;
    try {
      await fetch(`${API_URL}/reports/email`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, report_id: id, to: emailTo })});
      setEmailTo('');
      push({ kind:'success', text:'Email queued (stub)' });
    } catch (e:any) {
      push({ kind:'error', text:'Email failed' });
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Analytics & Reporting</h1>

      <div className="border rounded p-4 bg-white">
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs text-gray-600">Window (days)</label>
            <input type="number" min={7} max={90} value={days} onChange={e=>setDays(parseInt(e.target.value||'30'))} className="border rounded px-2 py-1 text-sm w-24" />
          </div>
          <div className="text-sm">
            <div>Overall Score: <span className="font-semibold">{score?.score ?? '—'}</span></div>
            <div className="text-gray-600">Avg sentiment: {score?.avg_sentiment ?? '—'} | Growth ratio: {score?.growth_ratio ?? '—'}</div>
          </div>
          <div className="ml-auto space-x-2">
            <button onClick={createReport} className="px-3 py-1 border rounded text-sm">Create Report</button>
            <button onClick={()=>exportCSV('overview')} className="px-3 py-1 border rounded text-sm" disabled={overviewLoading}>Export Overview CSV</button>
            <button onClick={()=>exportCSV('hours')} className="px-3 py-1 border rounded text-sm" disabled={overviewLoading}>Export Hours CSV</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Sentiment Trend</div>
          <div className="h-56">
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
        <div className="col-span-1 border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Best Posting Hour</div>
          <div className="text-4xl font-bold">{overview?.best_hour ?? '—'}</div>
          <div className="text-xs text-gray-600">Based on positive comment ratio over the last {days} days.</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Hourly Positive Ratio</div>
          <div className="h-56">
            {overview?.hours && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.hours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis domain={[0,1]} />
                  <Tooltip />
                  <Bar dataKey="positive_ratio" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-600 mb-2">Platforms Overview</div>
          <div className="space-y-2">
            {overview?.by_platform?.length ? overview.by_platform.map((bp:any)=> (
              <div key={bp.platform} className="border rounded p-2 text-sm flex justify-between items-center">
                <div>
                    <div className="font-semibold">{bp.platform}</div>
                    <div className="text-xs text-gray-600">{bp.comments} comments • {bp.comments_per_post} per post</div>
                </div>
                <div className="text-xs">
                  <span className="px-2 py-1 rounded bg-green-100 text-green-700 mr-2">+{bp.positive}</span>
                  <span className="px-2 py-1 rounded bg-red-100 text-red-700">-{bp.negative}</span>
                </div>
              </div>
            )) : <div className="text-xs text-gray-500">No data</div>}
          </div>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Reports</div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-600">Email</label>
              <input value={emailTo} onChange={e=>setEmailTo(e.target.value)} placeholder="name@example.com" className="border rounded px-2 py-1 text-sm" />
            </div>
            <button onClick={emailLatest} className="px-3 py-1 border rounded text-sm">Email Latest</button>
          </div>
        </div>
        <div className="space-y-2">
          {reports?.length ? reports.map((r:any)=> (
            <div key={r.id} className="border rounded p-2 text-sm flex items-center justify-between">
              <div>
                <div className="font-semibold">{r.title || 'Untitled report'}</div>
                <div className="text-xs text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</div>
              </div>
              <div className="space-x-2">
                <button onClick={()=>downloadReport(r.id, r.title)} className="text-xs px-2 py-1 border rounded">Download</button>
              </div>
            </div>
          )) : <div className="text-xs text-gray-500">No reports yet</div>}
        </div>
      </div>
    </div>
  );
}
