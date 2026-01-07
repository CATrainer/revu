'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateBrowser } from '@/components/monetization/TemplateBrowser';
import { ProjectCreationFlow } from '@/components/monetization/ProjectCreationFlow';

type View = 'browse' | 'create';

export default function NewProjectPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('browse');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setView('create');
  };

  const handleBack = () => {
    if (view === 'create') {
      setView('browse');
      setSelectedTemplateId(null);
    } else {
      router.push('/monetization-v2');
    }
  };

  const handleComplete = (projectId: string) => {
    router.push(`/monetization-v2/project/${projectId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      {view === 'browse' && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="w-fit px-0 text-secondary-dark hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary-dark">
              Choose a Monetization Template
            </h1>
            <p className="text-secondary-dark mt-2">
              Browse 50+ proven templates across 5 categories. Each includes a complete action plan.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {view === 'browse' && (
        <TemplateBrowser onSelectTemplate={handleSelectTemplate} />
      )}

      {view === 'create' && selectedTemplateId && (
        <ProjectCreationFlow
          templateId={selectedTemplateId}
          onBack={handleBack}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
