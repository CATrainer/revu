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
      <SelectTrigger className="w-[200px] bg-white dark:bg-[hsl(222,84%,8%)] border-gray-300 dark:border-[hsl(222,47%,16%)] text-gray-900 dark:text-[hsl(215,20%,85%)]">
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-gray-500 dark:text-[hsl(215,20%,65%)]" />
          <SelectValue placeholder="Select location" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-[hsl(222,84%,8%)] border-gray-200 dark:border-[hsl(222,47%,16%)]">
        {locations.map((location) => (
          <SelectItem 
            key={location.id} 
            value={location.id}
            className="text-gray-900 dark:text-[hsl(215,20%,85%)] hover:bg-gray-50 dark:hover:bg-[hsl(222,84%,12%)]"
          >
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}