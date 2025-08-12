// frontend/app/(dashboard)/automation/page.tsx
'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { Zap } from 'lucide-react';

export default function AutomationPage() {
  return (
    <div>
  <h1 className="text-2xl font-bold text-primary-dark mb-8">Automation Rules</h1>
      <EmptyState
        icon={Zap}
        title="No automation rules"
        description="Create rules to automate your review management workflow."
        action={{
          label: "Create Rule",
          onClick: () => console.log('Create rule')
        }}
      />
    </div>
  );
}