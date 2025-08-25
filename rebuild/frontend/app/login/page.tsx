"use client";
import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api-url';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
  // Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { alert(error.message); return; }
  // Ensure user exists in backend DB, default to 'waiting'
  const reg = await axios.post(API_URL + "/auth/signup", { email, account_type: "waiting" });
  const user_id = reg.data.user_id;
  setUserId(user_id);
  window.location.href = "/dashboard?user_id=" + user_id;
  }

  return (
    <div className="max-w-sm">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <form className="space-y-3" onSubmit={handleLogin}>
        <input className="w-full border p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full border p-2" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="px-3 py-2 bg-black text-white rounded" type="submit">Login</button>
      </form>
    </div>
  );
}
