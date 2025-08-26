// frontend/components/dashboard/LocationSelector.tsx
'use client';

import { MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';

export function LocationSelector() {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useStore();
  const { user } = useAuth();

  // Only show selector for Organization/Agency users (demo removed)
  const shouldShow = useMemo(() => {
    if (!user) return false;
    if (user.is_admin) return true;
    // If current workspace is Organization or Agency, selector is relevant
    return currentWorkspace?.type === 'Organization' || currentWorkspace?.type === 'Agency';
  }, [user, currentWorkspace]);

  // No demo data seeding; rely on real workspaces when multi-user/org returns
  // no side effects

  if (!shouldShow) return null;

  return (
    <Select value={currentWorkspace?.id} onValueChange={(v) => setCurrentWorkspace(v)}>
      <SelectTrigger className="w-[220px] card-background border-[var(--border)] text-primary-dark">
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-muted-dark" />
          <SelectValue placeholder="Select location" />
        </div>
      </SelectTrigger>
      <SelectContent className="card-background border-[var(--border)]">
        {workspaces.map((ws) => (
          <SelectItem
            key={ws.id}
            value={ws.id}
            className="text-primary-dark hover:section-background-alt"
          >
            {ws.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}