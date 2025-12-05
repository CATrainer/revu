'use client';

// This page renders the pipeline in list view
// Redirect to the main pipeline page with list view parameter
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PipelineListPage() {
  const router = useRouter();

  useEffect(() => {
    // The main pipeline page supports list view, redirect there
    router.replace('/agency/pipeline?view=list');
  }, [router]);

  return null;
}
