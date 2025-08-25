"use client";
import React from 'react';
import AlertsBadge from './AlertsBadge';

export default function NavLinks() {
  const [qs, setQs] = React.useState('');
  React.useEffect(() => {
    try {
      const search = window.location.search;
      setQs(search && search.length > 1 ? search : '');
    } catch {}
  }, []);
  const link = (path: string) => `${path}${qs}`;
  return (
    <>
  <a href={link('/dashboard')} className="text-sm">Dashboard</a>
      <a href={link('/demo')} className="text-sm">Demo</a>
      <a href={link('/comments')} className="text-sm">Comments</a>
      <a href={link('/connections')} className="text-sm">Connections</a>
      <a href={link('/competitors')} className="text-sm">Competitors</a>
      <a href={link('/insights')} className="text-sm">Insights</a>
      <a href={link('/ideas')} className="text-sm">Ideas</a>
      <a href={link('/schedule')} className="text-sm">Schedule</a>
      <a href={link('/analytics')} className="text-sm">Analytics</a>
  <a href={link('/socials')} className="text-sm inline-flex items-center gap-1">Socials <AlertsBadge /></a>
    </>
  );
}
