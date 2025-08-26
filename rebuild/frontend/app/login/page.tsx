"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const json = await postJSON<{ session_token: string }>(`/auth/login`, { email, password });
      if (typeof window !== 'undefined' && json.session_token) {
        localStorage.setItem('session_token', json.session_token);
      }
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form className="w-full max-w-sm space-y-3" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold mb-2">Login</h1>
        <input
          className="w-full border p-2 rounded"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border p-2 rounded"
          type="password"
          placeholder="Password (ignored)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="px-3 py-2 bg-black text-white rounded w-full" type="submit">
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </div>
  );
}
