"use client";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function AutomationNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (params.get('tab') || 'rules').toLowerCase();
  const isApprovals = pathname?.startsWith('/automation/approvals');

  const items = [
  { key: 'rules', label: 'Active Rules', href: '/automation?tab=rules' },
  { key: 'create', label: 'Create Rule', href: '/automation?tab=create' },
  { key: 'templates', label: 'Templates', href: '/automation?tab=templates' },
  { key: 'ab', label: 'A/B Tests', href: '/automation?tab=ab' },
  { key: 'learning', label: 'Learning', href: '/automation?tab=learning' },
  { key: 'approvals', label: 'Approval Queue', href: '/automation/approvals' },
  { key: 'analytics', label: 'Analytics', href: '/automation?tab=analytics' },
  ] as const;

  const activeKey = isApprovals ? 'approvals' : (
    tab === 'create' ? 'create'
    : tab === 'analytics' ? 'analytics'
    : tab === 'templates' ? 'templates'
    : tab === 'ab' ? 'ab'
    : tab === 'learning' ? 'learning'
    : 'rules'
  );

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
