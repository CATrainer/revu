"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Lightweight fetcher; adapt base path as needed
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

type QueueStatus = {
  pending_by_classification: Record<string, number>;
  pending_total: number;
  oldest_pending_age_seconds: number;
  estimated_seconds_to_next_batch: number | null;
  last_batch: { time: string | null; size: number | null };
  mode: "testing" | "production";
  average_processing_time_seconds: number | null;
};

function healthColor(pending: number, oldestAge: number) {
  if (pending === 0) return "text-green-600";
  if (pending <= 3 && oldestAge < 120) return "text-yellow-600";
  return "text-red-600";
}

function formatDuration(sec: number | null | undefined) {
  if (sec == null) return "—";
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export default function TestingStatusWidget() {
  const [data, setData] = useState<QueueStatus | null>(null);
  type Hist = { t: string; reason: string; count: number };
  const [history, setHistory] = useState<Hist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const mode = data?.mode ?? "production";
  const isTesting = mode === "testing";

  async function load() {
    setError(null);
    try {
      const json = await fetchJSON<QueueStatus>("/api/ai/queue-status");
      setData(json);
      const est = json.estimated_seconds_to_next_batch ?? 0;
      setCountdown(est);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Failed to load: ${msg}`);
    }
  }

  async function forceProcess() {
    try {
      await fetchJSON("/api/ai/force-process", { method: "POST" });
      await load();
      setHistory((h) => [{ t: new Date().toISOString(), reason: "force", count: data?.pending_total || 0 }, ...h].slice(0, 20));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Force failed: ${msg}`);
    }
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data?.estimated_seconds_to_next_batch]);

  const healthCls = useMemo(() => healthColor(data?.pending_total || 0, data?.oldest_pending_age_seconds || 0), [data]);

  return (
    <Card className="dashboard-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-primary-dark">Processing Status</CardTitle>
        {isTesting && (
          <Button size="sm" variant="secondary" onClick={forceProcess}>
            Force Process Now
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-secondary-dark">Queue Depth</div>
            <div className={`text-xl font-semibold ${healthCls}`}>{data?.pending_total ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-secondary-dark">Oldest Age</div>
            <div className="text-xl font-semibold">{formatDuration(data?.oldest_pending_age_seconds)}</div>
          </div>
          <div>
            <div className="text-xs text-secondary-dark">Next Auto Process</div>
            <div className="text-xl font-semibold">{formatDuration(countdown)}</div>
          </div>
          <div>
            <div className="text-xs text-secondary-dark">Last Batch Size</div>
            <div className="text-xl font-semibold">{data?.last_batch?.size ?? "—"}</div>
          </div>
        </div>

        <div>
          <div className="text-xs text-secondary-dark mb-1">By Classification</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data?.pending_by_classification || {}).map(([k, v]) => (
              <span key={k} className="text-xs rounded bg-muted px-2 py-1">
                {k}: {v}
              </span>
            ))}
            {(!data || Object.keys(data.pending_by_classification || {}).length === 0) && (
              <span className="text-xs text-secondary-dark">None</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs text-secondary-dark mb-1">Recent Processing</div>
          <div className="space-y-1">
            {history.length === 0 && <div className="text-xs text-secondary-dark">No recent events</div>}
            {history.map((h, i) => (
              <div key={i} className="text-xs flex items-center justify-between">
                <span>{new Date(h.t).toLocaleTimeString()} – {h.reason}</span>
                <span className="text-secondary-dark">{h.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
