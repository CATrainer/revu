"use client";
import React from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: ()=>void }) {
  return (
    <html>
      <body>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-600 mb-4">{error?.message || 'Unexpected error'}</p>
          <button onClick={()=>reset()} className="px-3 py-1 border rounded text-sm">Try again</button>
        </div>
      </body>
    </html>
  );
}
