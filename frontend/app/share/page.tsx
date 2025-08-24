// frontend/app/share/page.tsx
import { Suspense } from 'react';
import ShareClient from './ShareClient';

export default function SharePage() {
  return (
    <Suspense fallback={<div className="text-secondary-dark p-6">Loading shared link…</div>}>
      <ShareClient />
    </Suspense>
  );
}
