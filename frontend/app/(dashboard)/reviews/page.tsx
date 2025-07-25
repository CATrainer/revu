// frontend/app/(dashboard)/reviews/page.tsx
'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { MessageSquare } from 'lucide-react';

export default function ReviewsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Review Hub</h1>
      <EmptyState
        icon={MessageSquare}
        title="No reviews yet"
        description="When you connect your review platforms, your reviews will appear here."
        action={{
          label: "Connect Platforms",
          onClick: () => console.log('Connect platforms')
        }}
      />
    </div>
  );
}