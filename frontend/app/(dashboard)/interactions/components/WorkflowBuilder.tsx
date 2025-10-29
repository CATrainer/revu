'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { TriggerStep } from './workflow-steps/TriggerStep';
import { ConditionsStep } from './workflow-steps/ConditionsStep';
import { ActionsStep } from './workflow-steps/ActionsStep';
import { ReviewStep } from './workflow-steps/ReviewStep';

interface WorkflowBuilderProps {
  viewId: string | null;
  viewName?: string;
  existingWorkflow?: any;
  onClose: () => void;
  onSave: () => void;
}

interface WorkflowData {
  name: string;
  description: string;
  view_id: string | null;
  is_global: boolean;
  trigger: {
    type: string;
    platforms?: string[];
    interaction_types?: string[];
  };
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    config: any;
  }>;
}

const STEPS = [
  { id: 'basic', title: 'Basic Info', description: 'Name and scope' },
  { id: 'trigger', title: 'Trigger', description: 'When to run' },
  { id: 'conditions', title: 'Conditions', description: 'What to match' },
  { id: 'actions', title: 'Actions', description: 'What to do' },
  { id: 'review', title: 'Review', description: 'Confirm & save' },
];

export function WorkflowBuilder({
  viewId,
  viewName,
  existingWorkflow,
  onClose,
  onSave,
}: WorkflowBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    name: existingWorkflow?.name || '',
    description: existingWorkflow?.description || '',
    view_id: viewId,
    is_global: existingWorkflow?.is_global || false,
    trigger: existingWorkflow?.trigger || {
      type: 'new_interaction',
      platforms: [],
      interaction_types: [],
    },
    conditions: existingWorkflow?.conditions || [],
    actions: existingWorkflow?.actions || [],
  });

  const updateWorkflowData = (updates: Partial<WorkflowData>) => {
    setWorkflowData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async (activate: boolean = false) => {
    try {
      setSaving(true);
      
      const payload = {
        name: workflowData.name,
        description: workflowData.description,
        view_id: workflowData.is_global ? null : workflowData.view_id,
        is_global: workflowData.is_global,
        trigger: workflowData.trigger,
        conditions: workflowData.conditions,
        actions: workflowData.actions,
        status: activate ? 'active' : 'draft',
      };

      if (existingWorkflow) {
        await api.patch(`/workflows/${existingWorkflow.id}`, payload);
      } else {
        await api.post('/workflows', payload);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return workflowData.name.trim().length > 0;
      case 1: // Trigger
        return workflowData.trigger.type.length > 0;
      case 2: // Conditions
        return true; // Conditions are optional
      case 3: // Actions
        return workflowData.actions.length > 0;
      case 4: // Review
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-primary-dark">
              {existingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
            </h2>
            <p className="text-sm text-secondary-dark mt-1">
              {viewName && !workflowData.is_global ? `For ${viewName}` : 'Global workflow'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center font-medium text-sm transition-colors',
                      index < currentStep
                        ? 'bg-brand-primary text-white'
                        : index === currentStep
                        ? 'bg-brand-primary text-white ring-4 ring-brand-primary/20'
                        : 'bg-muted text-secondary-dark'
                    )}
                  >
                    {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="text-center mt-2">
                    <p
                      className={cn(
                        'text-xs font-medium',
                        index <= currentStep ? 'text-primary-dark' : 'text-secondary-dark'
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-secondary-dark">{step.description}</p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-full -mt-10',
                      index < currentStep ? 'bg-brand-primary' : 'bg-border'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentStep === 0 && (
            <BasicInfoStep
              workflowData={workflowData}
              updateWorkflowData={updateWorkflowData}
              viewName={viewName}
            />
          )}
          {currentStep === 1 && (
            <TriggerStep
              trigger={workflowData.trigger}
              onUpdate={(trigger) => updateWorkflowData({ trigger })}
            />
          )}
          {currentStep === 2 && (
            <ConditionsStep
              conditions={workflowData.conditions}
              onUpdate={(conditions: any) => updateWorkflowData({ conditions })}
            />
          )}
          {currentStep === 3 && (
            <ActionsStep
              actions={workflowData.actions}
              onUpdate={(actions: any) => updateWorkflowData({ actions })}
            />
          )}
          {currentStep === 4 && <ReviewStep workflowData={workflowData} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {currentStep === STEPS.length - 1 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={saving || !canProceed()}
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving || !canProceed()}
                >
                  {saving ? 'Saving...' : 'Save & Activate'}
                </Button>
              </>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Basic Info Step Component
interface BasicInfoStepProps {
  workflowData: WorkflowData;
  updateWorkflowData: (updates: Partial<WorkflowData>) => void;
  viewName?: string;
}

function BasicInfoStep({ workflowData, updateWorkflowData, viewName }: BasicInfoStepProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-primary-dark mb-4">Basic Information</h3>
        <p className="text-sm text-secondary-dark">
          Give your workflow a name and description to help you identify it later.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="workflow-name">Workflow Name *</Label>
          <Input
            id="workflow-name"
            placeholder="e.g., Auto-thank positive comments"
            value={workflowData.name}
            onChange={(e) => updateWorkflowData({ name: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="workflow-description">Description</Label>
          <Textarea
            id="workflow-description"
            placeholder="Describe what this workflow does..."
            value={workflowData.description}
            onChange={(e) => updateWorkflowData({ description: e.target.value })}
            className="mt-1.5"
            rows={3}
          />
        </div>

        <div className="border-t border-border pt-4">
          <Label>Workflow Scope</Label>
          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                checked={!workflowData.is_global}
                onChange={() => updateWorkflowData({ is_global: false })}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-primary-dark">
                  View-Specific {viewName && `(${viewName})`}
                </p>
                <p className="text-xs text-secondary-dark">
                  Only runs for interactions in this view
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                checked={workflowData.is_global}
                onChange={() => updateWorkflowData({ is_global: true })}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-primary-dark">Global</p>
                <p className="text-xs text-secondary-dark">
                  Runs for all interactions across all views
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
