"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pushToast } from '@/components/ui/toast';

type AccessStatus = 'waiting' | 'full';
type UserKind = 'content' | 'business';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  has_account: boolean;
  access_status: AccessStatus;
  user_kind?: UserKind;
  joined_waiting_list_at: string | null;
  early_access_granted_at: string | null;
  demo_requested: boolean;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccessStatus>('all');
  const [kindFilter, setKindFilter] = useState<'all' | UserKind>('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      pushToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateAccess = async (u: AdminUser) => {
    setSaving(u.id);
    try {
      await api.post(`/admin/users/${u.id}/access`, {
  access_status: u.access_status,
  user_kind: u.user_kind,
      });
      setSavedMap((m) => ({ ...m, [u.id]: true }));
      pushToast('Saved', 'success');
      setTimeout(() => setSavedMap((m) => ({ ...m, [u.id]: false })), 1500);
    } finally {
      setSaving(null);
    }
  };

  if (!user?.is_admin) {
    return (
      <Card className="card-background">
        <CardContent className="p-6 text-secondary-dark">Admin access required.</CardContent>
      </Card>
    );
  }

  const filteredSorted = (() => {
    const q = search.trim().toLowerCase();
    let list = users.filter(u => {
      const matchQ = q ? (`${u.full_name} ${u.email}`.toLowerCase().includes(q)) : true;
      const matchStatus = statusFilter === 'all' ? true : u.access_status === statusFilter;
      const kind = (u.user_kind || 'content');
      const matchKind = kindFilter === 'all' ? true : kind === kindFilter;
      return matchQ && matchStatus && matchKind;
    });
    list = list.sort((a, b) => {
      if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1;
      if (a.access_status !== b.access_status) return a.access_status === 'full' ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Admin</h1>
          <p className="text-secondary-dark text-sm">Manage access and personas. Total users: {users.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-[var(--border)]"
            onClick={load}
            disabled={loading}
          >{loading ? 'Refreshing…' : 'Refresh'}</Button>
          <Button
            onClick={async () => { await logout(); router.push('/login'); }}
            className="button-primary"
          >Log out</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="card-background">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="card-background border-[var(--border)]"
            />
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={(v: 'all' | AccessStatus) => setStatusFilter(v)}>
              <SelectTrigger className="w-[160px] card-background border-[var(--border)]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="card-background border-[var(--border)]">
                <SelectItem value="all">all statuses</SelectItem>
                <SelectItem value="waiting">waiting</SelectItem>
                <SelectItem value="full">full</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kindFilter} onValueChange={(v: 'all' | UserKind) => setKindFilter(v)}>
              <SelectTrigger className="w-[160px] card-background border-[var(--border)]">
                <SelectValue placeholder="Kind" />
              </SelectTrigger>
              <SelectContent className="card-background border-[var(--border)]">
                <SelectItem value="all">all kinds</SelectItem>
                <SelectItem value="content">content</SelectItem>
                <SelectItem value="business">business</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-background">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-6 text-secondary-dark">Loading users…</div>
          ) : filteredSorted.length === 0 ? (
            <div className="p-6 text-secondary-dark">No users match your filters.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-[var(--card-bg,white)] border-b border-[var(--border)]">
                <tr className="text-left text-secondary-dark">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Access</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border)] hover-background">
                    <td className="px-4 py-3 text-primary-dark font-medium">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-secondary-dark">{u.email}</td>
                    <td className="px-4 py-3">
                      <Select value={u.access_status} onValueChange={(v: AccessStatus) => setUsers(s => s.map(x => x.id === u.id ? { ...x, access_status: v } : x))}>
                        <SelectTrigger className="w-[160px] card-background border-[var(--border)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="card-background border-[var(--border)]">
                          <SelectItem value="waiting">waiting</SelectItem>
                          <SelectItem value="full">full</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={u.user_kind || 'content'}
                        onValueChange={(v: UserKind) => setUsers(s => s.map(x => x.id === u.id ? { ...x, user_kind: v } : x))}
                      >
                        <SelectTrigger className="w-[180px] card-background border-[var(--border)]">
                          <SelectValue placeholder="user kind" />
                        </SelectTrigger>
                        <SelectContent className="card-background border-[var(--border)]">
                          <SelectItem value="content">content</SelectItem>
                          <SelectItem value="business">business</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-secondary-dark">{u.joined_waiting_list_at ? new Date(u.joined_waiting_list_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-secondary-dark">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {savedMap[u.id] && <span className="text-xs text-emerald-600">Saved</span>}
                        <Button onClick={() => updateAccess(u)} disabled={saving === u.id} className="button-primary">
                          {saving === u.id ? 'Saving…' : 'Save'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
