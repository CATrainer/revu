// frontend/components/monetization/ProfileSelector.tsx
'use client';

import { Profile } from '@/types/monetization.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User } from 'lucide-react';

interface ProfileSelectorProps {
  profiles: Profile[];
  selectedProfile: Profile;
  onSelect: (profile: Profile) => void;
}

export function ProfileSelector({ profiles, selectedProfile, onSelect }: ProfileSelectorProps) {
  const handleValueChange = (value: string) => {
    const profile = profiles.find(p => p.id === value);
    if (profile) {
      onSelect(profile);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  return (
    <Select value={selectedProfile.id} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[280px] dashboard-card">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
            <div className="flex flex-col py-1">
              <span className="font-medium">{profile.name}</span>
              <span className="text-xs text-secondary-dark">
                {formatNumber(profile.followers)} followers • {profile.platform}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
