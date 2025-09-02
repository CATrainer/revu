"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';

function TabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={
        `px-3 py-2 text-sm rounded-md border transition-colors ` +
        (active
          ? 'bg-[var(--card-bg,white)] text-primary-dark border-[var(--border)] shadow-sm'
          : 'text-secondary-dark border-transparent hover:bg-muted/50')
      }
    >
      {label}
    </Link>
  );
}

export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Admin</h1>
          <p className="text-secondary-dark text-sm">Manage users and monitor system metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-sm underline">Back to app</Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TabLink href="/admin" label="Users" />
        <TabLink href="/admin/metrics" label="Metrics" />
      </div>

      <div>
        {children}
      </div>
    </div>
  );
}
