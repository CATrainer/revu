import React from 'react';
import '../globals.css';

export const metadata = { title: 'Monitoring Dashboard' };

export default function MonitoringLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {children}
    </div>
  );
}
