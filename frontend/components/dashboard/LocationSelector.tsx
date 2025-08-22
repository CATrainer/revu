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
import { useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { generateAllDemoData } from '@/lib/demo-data';
import { useAuth } from '@/lib/auth';

export function LocationSelector() {
  const { workspaces, currentWorkspace, setWorkspaces, setCurrentWorkspace } = useStore();
  const { user } = useAuth();

  // Only show selector for Organization/Agency users, or demo_access with agency subtype
  const shouldShow = useMemo(() => {
    if (!user) return false;
    if (user.is_admin) return true;
    if (user.access_status === 'demo_access') {
      return user.demo_access_type === 'agency_creators' || user.demo_access_type === 'agency_businesses';
    }
    // For non-demo, if current workspace is Organization or Agency, selector is relevant
    return currentWorkspace?.type === 'Organization' || currentWorkspace?.type === 'Agency';
  }, [user, currentWorkspace]);

  // Seed demo data once for selector; pages can import demo data for interactions separately
  useEffect(() => {
    if (workspaces.length === 0) {
      // Seed demo data based on user flavor if in demo access
      const flavor = user?.demo_access_type === 'agency_businesses'
        ? 'agency-businesses'
        : user?.demo_access_type === 'agency_creators'
          ? 'agency-creators'
          : 'default';
  const seeded = generateAllDemoData(flavor as 'default' | 'agency-creators' | 'agency-businesses');
      setWorkspaces(seeded.workspaces);
      // If agency demo, default to agency workspace so scoping applies
      if ((user?.demo_access_type === 'agency_businesses' || user?.demo_access_type === 'agency_creators') && seeded.workspaces.find(w => w.id === 'agency')) {
        setCurrentWorkspace('agency');
      }
      // Note: interactions seeded elsewhere per page
    }
  }, [workspaces.length, setWorkspaces, setCurrentWorkspace, user?.demo_access_type]);

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