"use client";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function AutomationNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (params.get('tab') || 'rules').toLowerCase();
  const isApprovals = pathname?.startsWith('/dashboard/automation/approvals');

  const items = [
    { key: 'rules', label: 'Active Rules', href: '/dashboard/automation?tab=rules' },
    { key: 'create', label: 'Create Rule', href: '/dashboard/automation?tab=create' },
    { key: 'approvals', label: 'Approval Queue', href: '/dashboard/automation/approvals' },
    { key: 'analytics', label: 'Analytics', href: '/dashboard/automation?tab=analytics' },
  ] as const;

  const activeKey = isApprovals ? 'approvals' : (tab === 'create' ? 'create' : (tab === 'analytics' ? 'analytics' : 'rules'));

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(i => (
        <Link key={i.key} href={i.href} className={`text-sm px-3 py-1 rounded border ${activeKey === i.key ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200'}`}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}
