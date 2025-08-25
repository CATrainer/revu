"use client";
import React from 'react';
import useSWR from 'swr';
import { API_URL } from '../app/api-url';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function AlertsBadge() {
  const [userId, setUserId] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setUserId(params.get('user_id'));
    } catch {}
  }, []);

  const { data } = useSWR(userId ? `${API_URL}/reputation/alerts?user_id=${userId}` : null, fetcher, { refreshInterval: 30000 });
  const count = Array.isArray(data) ? data.length : 0;
  if (!count) return null;
  const label = count > 9 ? '9+' : String(count);
  return (
    <span className="ml-1 inline-flex items-center justify-center text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-red-600 text-white align-top">
      {label}
    </span>
  );
}
