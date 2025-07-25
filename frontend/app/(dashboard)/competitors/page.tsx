// frontend/app/(dashboard)/competitors/page.tsx
'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { Trophy } from 'lucide-react';

export default function CompetitorsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Competitor Tracking</h1>
      <EmptyState
        icon={Trophy}
        title="No competitors added"
        description="Start tracking your competitors to benchmark your performance."
        action={{
          label: "Add Competitor",
          onClick: () => console.log('Add competitor')
        }}
      />
    </div>
  );
}