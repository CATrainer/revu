"use client";
import React, { useEffect, useState } from 'react';
import { API_URL } from '../api-url';

export default function ConnectionsPage() {
  const params = new URLSearchParams(typeof window!=='undefined'?window.location.search:"");
  const user_id = params.get('user_id');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [platform, setPlatform] = useState('youtube');
  const [tokens, setTokens] = useState('{}');
  const [profile, setProfile] = useState('');

  useEffect(()=>{
    if (!user_id) return;
    fetch(API_URL+`/profiles?user_id=${user_id}`).then(r=>r.json()).then(setProfiles)
  },[user_id])

  async function connect() {
    if (!profile) { alert('Select profile'); return; }
    let tok: any; try { tok = JSON.parse(tokens) } catch { alert('Tokens JSON invalid'); return }
    await fetch(API_URL+`/platform/connect`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ profile_id: profile, platform, tokens: tok }) })
    alert('Connected (saved). Fetching real uploads will be added later.');
  }

  async function syncUploads() {
    if (!profile) { alert('Select profile'); return; }
    await fetch(API_URL+`/platform/sync-uploads?profile_id=${profile}&platform=${platform}`, { method:'POST' })
    alert('Mock uploads created. Check Comments page.');
  }

  async function syncComments() {
    if (!profile) { alert('Select profile'); return; }
    await fetch(API_URL+`/platform/sync-comments?profile_id=${profile}&platform=${platform}`, { method:'POST' })
    alert('Mock comments added to recent uploads.');
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Connections</h1>
      <p className="text-sm text-gray-600">Select a profile and save tokens for a platform. OAuth flows will be wired later.</p>
      <div className="flex gap-2 items-center">
        <select className="border p-2" value={profile} onChange={e=>setProfile(e.target.value)}>
          <option value="">Select profile</option>
          {profiles.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="border p-2" value={platform} onChange={e=>setPlatform(e.target.value)}>
          <option value="youtube">YouTube</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Tokens JSON</label>
        <textarea className="w-full border p-2 h-40" value={tokens} onChange={e=>setTokens(e.target.value)} />
      </div>
      <button onClick={connect} className="px-3 py-2 bg-black text-white rounded">Save Connection</button>
      <div className="flex gap-2">
        <button onClick={syncUploads} className="px-3 py-2 border rounded">Sync Uploads</button>
        <button onClick={syncComments} className="px-3 py-2 border rounded">Sync Comments</button>
      </div>
    </div>
  )
}
