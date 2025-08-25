"use client";
import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api-url';

const contentTypes = ["Gaming","Beauty","Tech","Lifestyle","Education","Comedy","Other"];
const platformsList = ["YouTube","TikTok","Instagram"];
const freq = ["Daily","2-3x week","Weekly","Bi-weekly"];
const followers = ["<10k","10-50k","50-100k","100k-500k","500k-1M","1M+"];

export default function DemoPage() {
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("Tech");
  const [platforms, setPlatforms] = useState<string[]>(["YouTube","TikTok"]);
  const [frequency, setFrequency] = useState("Weekly");
  const [fcount, setFcount] = useState("10-50k");
  const [creators, setCreators] = useState("");

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev, p])
  }

  async function startDemo(e: React.FormEvent) {
    e.preventDefault();
    // create demo user and dataset
  const signup = await axios.post(API_URL + "/auth/signup", { email, account_type: "demo" });
    const user_id = signup.data.user_id;
  await axios.post(API_URL + "/demo/setup?user_id="+user_id, {
      content_type: content,
      platforms,
      frequency,
      followers: fcount,
      creators: creators ? creators.split(",").map(s=>s.trim()) : []
    });
    window.location.href = "/dashboard?user_id="+user_id;
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Demo Setup</h1>
      <form onSubmit={startDemo} className="space-y-3">
        <input className="w-full border p-2" placeholder="Your email" value={email} onChange={e=>setEmail(e.target.value)} />
        <div>
          <label className="block text-sm mb-1">What type of content?</label>
          <select className="border p-2" value={content} onChange={e=>setContent(e.target.value)}>
            {contentTypes.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Which platforms? (multi)</label>
          <div className="flex gap-2 flex-wrap">
            {platformsList.map(p=> (
              <button type="button" key={p} onClick={()=>togglePlatform(p)} className={`px-2 py-1 border rounded ${platforms.includes(p)?'bg-black text-white':''}`}>{p}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">How often do you post?</label>
          <select className="border p-2" value={frequency} onChange={e=>setFrequency(e.target.value)}>
            {freq.map(f=> <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Follower count?</label>
          <select className="border p-2" value={fcount} onChange={e=>setFcount(e.target.value)}>
            {followers.map(f=> <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">[For orgs] Creators (comma-separated)</label>
          <input className="w-full border p-2" placeholder="Alice,Bob,..." value={creators} onChange={e=>setCreators(e.target.value)} />
        </div>
        <button className="px-3 py-2 bg-black text-white rounded" type="submit">Generate Demo</button>
      </form>
    </div>
  )
}
