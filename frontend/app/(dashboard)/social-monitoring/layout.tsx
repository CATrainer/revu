import React from 'react';

export default function MonitoringLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full">{children}</div>
  );
}
