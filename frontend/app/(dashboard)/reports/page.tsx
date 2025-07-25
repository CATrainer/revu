// frontend/app/(dashboard)/reports/page.tsx
'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Reports</h1>
      <EmptyState
        icon={FileText}
        title="No reports generated"
        description="Generate your first report to analyze your review performance."
        action={{
          label: "Generate Report",
          onClick: () => console.log('Generate report')
        }}
      />
    </div>
  );
}