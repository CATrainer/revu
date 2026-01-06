'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Sparkles, Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Workflow, View } from '../types/workflow';

interface WorkflowBuilderV2Props {
  existingWorkflow?: Workflow | null;
  views: View[];
  onClose: () => void;
  onSave: () => void;
}

interface WorkflowData {
  name: string;
  platforms: string[];
  interaction_types: string[];
  view_ids: string[];
  ai_conditions: string[];  // Multiple conditions with OR logic
  action_type: 'auto_respond' | 'generate_response';
  action_config: {
    response_text?: string;
    tone?: string;
    ai_instructions?: string;
  };
  status: 'active' | 'paused';
}

const STEPS = [
  { id: 'basic', title: 'Name & Action', description: 'What to do' },
  { id: 'filters', title: 'Filters', description: 'When to run' },
  { id: 'review', title: 'Review', description: 'Confirm & save' },
];

const PLATFORMS = [
  { value: 'youtube', label: 'YouTube', icon: '🎥' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'twitter', label: 'Twitter/X', icon: '🐦' },
];

const INTERACTION_TYPES = [
  { value: 'comment', label: 'Comments' },
  { value: 'dm', label: 'Direct Messages' },
  { value: 'mention', label: 'Mentions' },
];

export function WorkflowBuilderV2({
  existingWorkflow,
  views,
  onClose,
  onSave,
}: WorkflowBuilderV2Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    name: existingWorkflow?.name || '',
    platforms: existingWorkflow?.platforms || [],
    interaction_types: existingWorkflow?.interaction_types || [],
    view_ids: existingWorkflow?.view_ids || [],
    ai_conditions: existingWorkflow?.ai_conditions || [],
    action_type: existingWorkflow?.action_type || 'generate_response',
    action_config: existingWorkflow?.action_config || { tone: 'friendly' },
    status: existingWorkflow?.status || 'active',
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
        platforms: workflowData.platforms.length > 0 ? workflowData.platforms : null,
        interaction_types: workflowData.interaction_types.length > 0 ? workflowData.interaction_types : null,
        view_ids: workflowData.view_ids.length > 0 ? workflowData.view_ids : null,
        ai_conditions: workflowData.ai_conditions.filter(c => c.trim()).length > 0 ? workflowData.ai_conditions.filter(c => c.trim()) : null,
        action_type: workflowData.action_type,
        action_config: workflowData.action_config,
        status: activate ? 'active' : 'paused',
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
      case 0: // Basic Info & Action
        if (!workflowData.name.trim()) return false;
        if (workflowData.action_type === 'auto_respond' && !workflowData.action_config.response_text?.trim()) {
          return false;
        }
        if (workflowData.action_type === 'generate_response' && !workflowData.action_config.ai_instructions?.trim()) {
          return false;
        }
        return true;
      case 1: // Filters
        return true; // Filters are optional
      case 2: // Review
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-primary-dark">
              {existingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
            </h2>
            <p className="text-sm text-secondary-dark mt-1">
              Automate responses to incoming messages
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
            <BasicAndActionStep
              workflowData={workflowData}
              updateWorkflowData={updateWorkflowData}
            />
          )}
          {currentStep === 1 && (
            <FiltersStep
              workflowData={workflowData}
              updateWorkflowData={updateWorkflowData}
              views={views}
            />
          )}
          {currentStep === 2 && (
            <ReviewStep workflowData={workflowData} views={views} />
          )}
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
                  Save as Paused
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

// Step 1: Basic Info & Action
interface BasicAndActionStepProps {
  workflowData: WorkflowData;
  updateWorkflowData: (updates: Partial<WorkflowData>) => void;
}

function BasicAndActionStep({ workflowData, updateWorkflowData }: BasicAndActionStepProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-primary-dark mb-2">Name & Action</h3>
        <p className="text-sm text-secondary-dark">
          Give your workflow a name and choose what action to take.
        </p>
      </div>

      {/* Workflow Name */}
      <div>
        <Label htmlFor="workflow-name">Workflow Name *</Label>
        <Input
          id="workflow-name"
          placeholder="e.g., Auto-reply to questions"
          value={workflowData.name}
          onChange={(e) => updateWorkflowData({ name: e.target.value })}
          className="mt-1.5"
        />
      </div>

      {/* Action Type Selection */}
      <div className="border-t border-border pt-4">
        <Label>Action Type *</Label>
        <p className="text-xs text-secondary-dark mb-3">
          Choose what happens when a message matches this workflow
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Generate Response (Approval) */}
          <button
            onClick={() => updateWorkflowData({ 
              action_type: 'generate_response',
              action_config: { tone: workflowData.action_config.tone || 'friendly' }
            })}
            className={cn(
              'flex flex-col items-center gap-3 p-4 border rounded-lg transition-all text-left',
              workflowData.action_type === 'generate_response'
                ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <Sparkles className={cn(
              'h-8 w-8',
              workflowData.action_type === 'generate_response' ? 'text-brand-primary' : 'text-purple-500'
            )} />
            <div className="text-center">
              <p className="text-sm font-medium text-primary-dark">Generate Response</p>
              <p className="text-xs text-secondary-dark mt-1">
                AI creates a response for your approval before sending
              </p>
            </div>
          </button>

          {/* Auto-Respond */}
          <button
            onClick={() => updateWorkflowData({ 
              action_type: 'auto_respond',
              action_config: { response_text: workflowData.action_config.response_text || '' }
            })}
            className={cn(
              'flex flex-col items-center gap-3 p-4 border rounded-lg transition-all text-left',
              workflowData.action_type === 'auto_respond'
                ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <Send className={cn(
              'h-8 w-8',
              workflowData.action_type === 'auto_respond' ? 'text-brand-primary' : 'text-green-500'
            )} />
            <div className="text-center">
              <p className="text-sm font-medium text-primary-dark">Auto-Respond</p>
              <p className="text-xs text-secondary-dark mt-1">
                Automatically send a fixed response immediately
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Action Configuration */}
      <div className="border-t border-border pt-4">
        {workflowData.action_type === 'generate_response' ? (
          <div className="space-y-4">
            {/* AI Instructions */}
            <div>
              <Label>Response Instructions *</Label>
              <Textarea
                value={workflowData.action_config.ai_instructions || ''}
                onChange={(e) => updateWorkflowData({ 
                  action_config: { ...workflowData.action_config, ai_instructions: e.target.value }
                })}
                placeholder="Tell the AI how to respond. For example:\n- Thank them for their comment\n- Answer questions about our product\n- Include a call-to-action to check out our latest video\n- Keep responses under 2 sentences"
                className="mt-1.5"
                rows={5}
              />
              <p className="text-xs text-secondary-dark mt-1.5">
                Describe what the AI should include in responses, what to avoid, and any specific information to mention.
              </p>
            </div>

            {/* Response Tone */}
            <div>
              <Label>Response Tone</Label>
              <Select
                value={workflowData.action_config.tone || 'friendly'}
                onValueChange={(value) => updateWorkflowData({ 
                  action_config: { ...workflowData.action_config, tone: value }
                })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly & Warm</SelectItem>
                  <SelectItem value="professional">Professional & Polished</SelectItem>
                  <SelectItem value="casual">Casual & Relaxed</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic & Energetic</SelectItem>
                  <SelectItem value="empathetic">Empathetic & Understanding</SelectItem>
                  <SelectItem value="witty">Witty & Playful</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-secondary-dark mt-1.5">
                Sets the overall tone and personality of AI responses
              </p>
            </div>
          </div>
        ) : (
          <div>
            <Label>Response Message *</Label>
            <Textarea
              value={workflowData.action_config.response_text || ''}
              onChange={(e) => updateWorkflowData({ 
                action_config: { ...workflowData.action_config, response_text: e.target.value }
              })}
              placeholder="Enter the exact message to send automatically..."
              className="mt-1.5"
              rows={4}
            />
            <p className="text-xs text-secondary-dark mt-1.5">
              This exact message will be sent automatically without approval
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 2: Filters
interface FiltersStepProps {
  workflowData: WorkflowData;
  updateWorkflowData: (updates: Partial<WorkflowData>) => void;
  views: Array<{ id: string; name: string; icon?: string }>;
}

function FiltersStep({ workflowData, updateWorkflowData, views }: FiltersStepProps) {
  const togglePlatform = (platform: string) => {
    const platforms = workflowData.platforms || [];
    const updated = platforms.includes(platform)
      ? platforms.filter(p => p !== platform)
      : [...platforms, platform];
    updateWorkflowData({ platforms: updated });
  };

  const toggleInteractionType = (type: string) => {
    const types = workflowData.interaction_types || [];
    const updated = types.includes(type)
      ? types.filter(t => t !== type)
      : [...types, type];
    updateWorkflowData({ interaction_types: updated });
  };

  const toggleView = (viewId: string) => {
    const viewIds = workflowData.view_ids || [];
    const updated = viewIds.includes(viewId)
      ? viewIds.filter(v => v !== viewId)
      : [...viewIds, viewId];
    updateWorkflowData({ view_ids: updated });
  };

  const selectAllViews = () => {
    updateWorkflowData({ view_ids: [] }); // Empty = all views
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-primary-dark mb-2">Filters</h3>
        <p className="text-sm text-secondary-dark">
          Define which messages this workflow applies to. Leave empty to apply to all.
        </p>
      </div>

      {/* Platform Filter */}
      <div>
        <Label>Platforms</Label>
        <p className="text-xs text-secondary-dark mb-3">
          Leave all unchecked to run on all platforms
        </p>
        <div className="grid grid-cols-2 gap-3">
          {PLATFORMS.map((platform) => (
            <label
              key={platform.value}
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={workflowData.platforms?.includes(platform.value)}
                onCheckedChange={() => togglePlatform(platform.value)}
              />
              <span className="text-lg">{platform.icon}</span>
              <span className="text-sm font-medium">{platform.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Interaction Type Filter */}
      <div className="border-t border-border pt-4">
        <Label>Interaction Types</Label>
        <p className="text-xs text-secondary-dark mb-3">
          Leave all unchecked to run on all types
        </p>
        <div className="grid grid-cols-3 gap-3">
          {INTERACTION_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={workflowData.interaction_types?.includes(type.value)}
                onCheckedChange={() => toggleInteractionType(type.value)}
              />
              <span className="text-sm font-medium">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* View Scope */}
      <div className="border-t border-border pt-4">
        <Label>View Scope</Label>
        <p className="text-xs text-secondary-dark mb-3">
          Only run for messages that match specific views, or leave empty for all messages
        </p>
        
        <div className="space-y-2">
          <label
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
              workflowData.view_ids.length === 0
                ? 'border-brand-primary bg-brand-primary/5'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <Checkbox
              checked={workflowData.view_ids.length === 0}
              onCheckedChange={selectAllViews}
            />
            <Zap className="h-4 w-4 text-brand-primary" />
            <span className="text-sm font-medium">All Messages</span>
            <span className="text-xs text-secondary-dark ml-auto">Workflow runs on every incoming message</span>
          </label>
          
          {views.filter(v => !['All', 'Awaiting Approval', 'Archive', 'Sent'].includes(v.name)).map((view) => (
            <label
              key={view.id}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                workflowData.view_ids.includes(view.id)
                  ? 'border-brand-primary bg-brand-primary/5'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <Checkbox
                checked={workflowData.view_ids.includes(view.id)}
                onCheckedChange={() => toggleView(view.id)}
                disabled={workflowData.view_ids.length === 0}
              />
              <span className="text-lg">{view.icon || '📁'}</span>
              <span className="text-sm font-medium">{view.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* AI Conditions */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <Label>AI Conditions (Optional)</Label>
        </div>
        <p className="text-xs text-secondary-dark mb-3">
          Add conditions that describe when this workflow should run. If multiple conditions are added, the workflow runs if ANY condition matches (OR logic).
        </p>
        
        {/* Existing conditions */}
        <div className="space-y-2 mb-3">
          {workflowData.ai_conditions.map((condition, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={condition}
                onChange={(e) => {
                  const newConditions = [...workflowData.ai_conditions];
                  newConditions[index] = e.target.value;
                  updateWorkflowData({ ai_conditions: newConditions });
                }}
                placeholder="e.g., Questions about pricing"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive"
                onClick={() => {
                  const newConditions = workflowData.ai_conditions.filter((_, i) => i !== index);
                  updateWorkflowData({ ai_conditions: newConditions });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        
        {/* Add new condition button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateWorkflowData({ ai_conditions: [...workflowData.ai_conditions, ''] })}
        >
          + Add Condition
        </Button>
        
        <p className="text-xs text-secondary-dark mt-3">
          Examples: "Negative feedback or complaints", "Questions about shipping", "Collaboration requests"
        </p>
      </div>
    </div>
  );
}

// Step 3: Review
interface ReviewStepProps {
  workflowData: WorkflowData;
  views: Array<{ id: string; name: string; icon?: string }>;
}

function ReviewStep({ workflowData, views }: ReviewStepProps) {
  const selectedViews = views.filter(v => workflowData.view_ids.includes(v.id));
  
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-primary-dark mb-2">Review Workflow</h3>
        <p className="text-sm text-secondary-dark">
          Confirm your workflow settings before saving.
        </p>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium text-secondary-dark uppercase tracking-wide mb-1">Name</p>
          <p className="text-sm font-medium text-primary-dark">{workflowData.name}</p>
        </div>

        {/* Action */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium text-secondary-dark uppercase tracking-wide mb-1">Action</p>
          <div className="flex items-center gap-2">
            {workflowData.action_type === 'generate_response' ? (
              <>
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-primary-dark">
                  Generate Response ({workflowData.action_config.tone} tone)
                </span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-primary-dark">Auto-Respond</span>
              </>
            )}
          </div>
          {workflowData.action_type === 'generate_response' && workflowData.action_config.ai_instructions && (
            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-800">
              <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">AI Instructions:</p>
              <p className="text-xs text-purple-900 dark:text-purple-100 whitespace-pre-wrap">
                {workflowData.action_config.ai_instructions.slice(0, 200)}
                {workflowData.action_config.ai_instructions.length > 200 ? '...' : ''}
              </p>
            </div>
          )}
          {workflowData.action_type === 'auto_respond' && workflowData.action_config.response_text && (
            <p className="text-xs text-secondary-dark mt-2 italic">
              "{workflowData.action_config.response_text.slice(0, 100)}
              {workflowData.action_config.response_text.length > 100 ? '...' : ''}"
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium text-secondary-dark uppercase tracking-wide mb-2">Filters</p>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-secondary-dark">Platforms:</span>{' '}
              <span className="font-medium">
                {workflowData.platforms.length > 0 
                  ? workflowData.platforms.map(p => PLATFORMS.find(pl => pl.value === p)?.label).join(', ')
                  : 'All platforms'}
              </span>
            </p>
            <p>
              <span className="text-secondary-dark">Types:</span>{' '}
              <span className="font-medium">
                {workflowData.interaction_types.length > 0 
                  ? workflowData.interaction_types.map(t => INTERACTION_TYPES.find(it => it.value === t)?.label).join(', ')
                  : 'All types'}
              </span>
            </p>
            <p>
              <span className="text-secondary-dark">Views:</span>{' '}
              <span className="font-medium">
                {workflowData.view_ids.length > 0 
                  ? selectedViews.map(v => v.name).join(', ')
                  : 'All messages'}
              </span>
            </p>
          </div>
        </div>

        {/* AI Conditions */}
        {workflowData.ai_conditions.filter(c => c.trim()).length > 0 && (
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <p className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                AI Conditions (OR)
              </p>
            </div>
            <ul className="space-y-1">
              {workflowData.ai_conditions.filter(c => c.trim()).map((condition, index) => (
                <li key={index} className="text-sm text-purple-900 dark:text-purple-100">
                  • {condition}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
