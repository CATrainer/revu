"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AccessStatus = 'waiting_list' | 'early_access' | 'full_access' | 'demo_access';
type DemoAccessType = 'creator' | 'business' | 'agency_creators' | 'agency_businesses' | null;

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  has_account: boolean;
  access_status: AccessStatus;
  demo_access_type: DemoAccessType;
  joined_waiting_list_at: string | null;
  early_access_granted_at: string | null;
  demo_requested: boolean;
  created_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/users');
        setUsers(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateAccess = async (u: AdminUser) => {
    setSaving(u.id);
    try {
      await api.post(`/admin/users/${u.id}/access`, {
        access_status: u.access_status,
        demo_access_type: u.access_status === 'demo_access' ? u.demo_access_type : null,
      });
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Admin</h1>
      {loading ? (
        <div className="text-secondary-dark">Loading users…</div>
      ) : (
        <div className="space-y-4">
          {users.map(u => (
            <Card key={u.id} className="card-background">
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                <div className="md:col-span-2">
                  <div className="text-primary-dark font-medium">{u.full_name}</div>
                  <div className="text-secondary-dark text-sm">{u.email}</div>
                </div>
                <div>
                  <Select value={u.access_status} onValueChange={(v: AccessStatus) => setUsers(s => s.map(x => x.id === u.id ? { ...x, access_status: v } : x))}>
                    <SelectTrigger className="w-[180px] card-background border-[var(--border)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="card-background border-[var(--border)]">
                      <SelectItem value="waiting_list">waiting_list</SelectItem>
                      <SelectItem value="early_access">early_access</SelectItem>
                      <SelectItem value="full_access">full_access</SelectItem>
                      <SelectItem value="demo_access">demo_access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select
                    value={u.demo_access_type || ''}
                    onValueChange={(v: string) => setUsers(s => s.map(x => x.id === u.id ? { ...x, demo_access_type: (v as DemoAccessType) || null } : x))}
                    disabled={u.access_status !== 'demo_access'}
                  >
                    <SelectTrigger className="w-[220px] card-background border-[var(--border)]">
                      <SelectValue placeholder="demo subtype" />
                    </SelectTrigger>
                    <SelectContent className="card-background border-[var(--border)]">
                      <SelectItem value="creator">creator</SelectItem>
                      <SelectItem value="business">business</SelectItem>
                      <SelectItem value="agency_creators">agency_creators</SelectItem>
                      <SelectItem value="agency_businesses">agency_businesses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-secondary-dark text-sm">
                  Joined: {u.joined_waiting_list_at ? new Date(u.joined_waiting_list_at).toLocaleDateString() : '-'}
                </div>
                <div>
                  <Button onClick={() => updateAccess(u)} disabled={saving === u.id} className="button-primary">
                    {saving === u.id ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
