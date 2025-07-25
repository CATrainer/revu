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

export function LocationSelector() {
  // This will be connected to actual data later
  const locations = [
    { id: '1', name: 'Main Street Location' },
    { id: '2', name: 'Downtown Branch' },
    { id: '3', name: 'Westside Restaurant' },
  ];

  return (
    <Select defaultValue="1">
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Select location" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}