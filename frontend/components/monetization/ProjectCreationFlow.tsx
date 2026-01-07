'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getTemplate, createProject } from '@/lib/monetization-api';
import type { TemplateDetail, DecisionPoint } from '@/types/monetization';
import { CATEGORY_INFO } from '@/types/monetization';

interface ProjectCreationFlowProps {
  templateId: string;
  onBack: () => void;
  onComplete: (projectId: string) => void;
}

type Step = 'review' | 'decisions' | 'confirm';

export function ProjectCreationFlow({ templateId, onBack, onComplete }: ProjectCreationFlowProps) {
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('review');
  const [projectTitle, setProjectTitle] = useState('');
  const [decisionValues, setDecisionValues] = useState<Record<string, string | number | boolean>>({});
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const loadTemplate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTemplate(templateId);
      setTemplate(data);
      setProjectTitle(data.title);
      
      // Initialize decision values with defaults
      const defaults: Record<string, string | number | boolean> = {};
      data.decision_points.forEach(dp => {
        if (dp.default !== undefined) {
          defaults[dp.key] = dp.default;
        }
      });
      setDecisionValues(defaults);
    } catch (err) {
      setError('Failed to load template details.');
      console.error('Error loading template:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecisionChange = (key: string, value: string | number | boolean) => {
    setDecisionValues(prev => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!template) return;
    
    setIsCreating(true);
    try {
      const project = await createProject({
        template_id: templateId,
        title: projectTitle || template.title,
        decision_values: decisionValues,
      });
      onComplete(project.id);
    } catch (err) {
      setError('Failed to create project. Please try again.');
      console.error('Error creating project:', err);
      setIsCreating(false);
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'review', label: 'Review Template' },
    { key: 'decisions', label: 'Configure Options' },
    { key: 'confirm', label: 'Start Project' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  const hasDecisions = template && template.decision_points.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 mb-4">{error || 'Template not found'}</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const categoryInfo = CATEGORY_INFO[template.category] || { icon: '📋', label: template.category };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {steps.map((step, index) => {
          // Skip decisions step if no decision points
          if (step.key === 'decisions' && !hasDecisions) return null;
          
          const isActive = step.key === currentStep;
          const isComplete = index < currentStepIndex;
          
          return (
            <div key={step.key} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--brand-primary)] text-white'
                    : isComplete
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={cn('text-sm', isActive ? 'text-primary-dark font-medium' : 'text-secondary-dark')}>
                {step.label}
              </span>
              {index < steps.length - 1 && step.key !== 'decisions' && (
                <div className="w-12 h-0.5 bg-gray-200 dark:bg-gray-700 mx-2" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="dashboard-card p-8">
        {currentStep === 'review' && (
          <ReviewStep
            template={template}
            categoryInfo={categoryInfo}
            projectTitle={projectTitle}
            onTitleChange={setProjectTitle}
          />
        )}

        {currentStep === 'decisions' && hasDecisions && (
          <DecisionsStep
            template={template}
            decisionValues={decisionValues}
            onDecisionChange={handleDecisionChange}
          />
        )}

        {currentStep === 'confirm' && (
          <ConfirmStep
            template={template}
            projectTitle={projectTitle}
            decisionValues={decisionValues}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (currentStep === 'review') {
              onBack();
            } else if (currentStep === 'decisions') {
              setCurrentStep('review');
            } else {
              setCurrentStep(hasDecisions ? 'decisions' : 'review');
            }
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep === 'confirm' ? (
          <Button onClick={handleCreate} disabled={isCreating} size="lg">
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Project...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Start Project
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => {
              if (currentStep === 'review') {
                setCurrentStep(hasDecisions ? 'decisions' : 'confirm');
              } else {
                setCurrentStep('confirm');
              }
            }}
            size="lg"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface ReviewStepProps {
  template: TemplateDetail;
  categoryInfo: { icon: string; label: string };
  projectTitle: string;
  onTitleChange: (title: string) => void;
}

function ReviewStep({ template, categoryInfo, projectTitle, onTitleChange }: ReviewStepProps) {
  const formatRevenue = (range: { low: number; high: number; unit: string }) => {
    const formatNum = (n: number) => {
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
      return `$${n}`;
    };
    const unitLabel = range.unit.replace('per_', '/').replace('_', ' ');
    return `${formatNum(range.low)} - ${formatNum(range.high)} ${unitLabel}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <span className="text-4xl">{categoryInfo.icon}</span>
        <div>
          <h2 className="text-2xl font-bold text-primary-dark">{template.title}</h2>
          <p className="text-secondary-dark mt-1">{template.description}</p>
        </div>
      </div>

      {/* Project Title */}
      <div className="space-y-2">
        <Label htmlFor="projectTitle">Project Name</Label>
        <Input
          id="projectTitle"
          value={projectTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter a name for your project"
        />
        <p className="text-xs text-secondary-dark">You can customize this to make it your own</p>
      </div>

      {/* Key Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-sm text-secondary-dark mb-1">Expected Revenue</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatRevenue(template.expected_revenue_range)}
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-secondary-dark mb-1">Timeline</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {template.expected_timeline}
          </div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-sm text-secondary-dark mb-1">Revenue Model</div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400 capitalize">
            {template.revenue_model}
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      {template.prerequisites.length > 0 && (
        <div>
          <h3 className="font-semibold text-primary-dark mb-3">Prerequisites</h3>
          <ul className="space-y-2">
            {template.prerequisites.map((prereq, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-secondary-dark">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{prereq}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Plan Preview */}
      <div>
        <h3 className="font-semibold text-primary-dark mb-3">
          Action Plan ({template.action_plan.length} phases)
        </h3>
        <div className="space-y-2">
          {template.action_plan.map((phase) => (
            <div key={phase.phase} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center text-sm font-medium">
                {phase.phase}
              </div>
              <div>
                <div className="font-medium text-primary-dark">{phase.phase_name}</div>
                <div className="text-xs text-secondary-dark">{phase.tasks.length} tasks</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DecisionsStepProps {
  template: TemplateDetail;
  decisionValues: Record<string, string | number | boolean>;
  onDecisionChange: (key: string, value: string | number | boolean) => void;
}

function DecisionsStep({ template, decisionValues, onDecisionChange }: DecisionsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary-dark">Configure Your Project</h2>
        <p className="text-secondary-dark mt-1">
          Answer these questions to customize your action plan
        </p>
      </div>

      <div className="space-y-6">
        {template.decision_points.map((dp) => (
          <DecisionPointInput
            key={dp.key}
            decisionPoint={dp}
            value={decisionValues[dp.key]}
            onChange={(value) => onDecisionChange(dp.key, value)}
          />
        ))}
      </div>
    </div>
  );
}

interface DecisionPointInputProps {
  decisionPoint: DecisionPoint;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}

function DecisionPointInput({ decisionPoint, value, onChange }: DecisionPointInputProps) {
  const { key, label, type, options, default: defaultValue } = decisionPoint;

  return (
    <div className="space-y-2">
      <Label htmlFor={key} className="text-base font-medium">
        {label}
      </Label>

      {type === 'select' && options && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                'p-4 rounded-lg border-2 text-left transition-all',
                value === option.value
                  ? 'border-[var(--brand-primary)] bg-purple-50 dark:bg-purple-950/20'
                  : 'border-[var(--border)] hover:border-gray-300'
              )}
            >
              <div className="font-medium text-primary-dark">{option.label}</div>
            </button>
          ))}
        </div>
      )}

      {type === 'text' && (
        <Input
          id={key}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      )}

      {type === 'number' && (
        <Input
          id={key}
          type="number"
          value={(value as number) || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      )}

      {type === 'boolean' && (
        <div className="flex gap-3">
          <button
            onClick={() => onChange(true)}
            className={cn(
              'px-6 py-3 rounded-lg border-2 transition-all',
              value === true
                ? 'border-[var(--brand-primary)] bg-purple-50 dark:bg-purple-950/20'
                : 'border-[var(--border)] hover:border-gray-300'
            )}
          >
            Yes
          </button>
          <button
            onClick={() => onChange(false)}
            className={cn(
              'px-6 py-3 rounded-lg border-2 transition-all',
              value === false
                ? 'border-[var(--brand-primary)] bg-purple-50 dark:bg-purple-950/20'
                : 'border-[var(--border)] hover:border-gray-300'
            )}
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}

interface ConfirmStepProps {
  template: TemplateDetail;
  projectTitle: string;
  decisionValues: Record<string, string | number | boolean>;
}

function ConfirmStep({ template, projectTitle, decisionValues }: ConfirmStepProps) {
  const totalTasks = template.action_plan.reduce((sum, phase) => sum + phase.tasks.length, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <Sparkles className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-primary-dark">Ready to Start!</h2>
        <p className="text-secondary-dark mt-1">
          Your personalized action plan is ready
        </p>
      </div>

      <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-secondary-dark">Project Name</span>
          <span className="font-medium text-primary-dark">{projectTitle}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-secondary-dark">Template</span>
          <span className="font-medium text-primary-dark">{template.title}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-secondary-dark">Total Phases</span>
          <span className="font-medium text-primary-dark">{template.action_plan.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-secondary-dark">Total Tasks</span>
          <span className="font-medium text-primary-dark">{totalTasks}</span>
        </div>

        {Object.keys(decisionValues).length > 0 && (
          <>
            <div className="border-t border-[var(--border)] pt-4 mt-4">
              <div className="text-sm font-medium text-primary-dark mb-2">Your Choices</div>
              {Object.entries(decisionValues).map(([key, value]) => {
                const dp = template.decision_points.find(d => d.key === key);
                if (!dp) return null;
                
                let displayValue = String(value);
                if (dp.type === 'select' && dp.options) {
                  const option = dp.options.find(o => o.value === value);
                  if (option) displayValue = option.label;
                } else if (dp.type === 'boolean') {
                  displayValue = value ? 'Yes' : 'No';
                }

                return (
                  <div key={key} className="flex items-center justify-between text-sm py-1">
                    <span className="text-secondary-dark">{dp.label}</span>
                    <span className="text-primary-dark">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className="text-center text-sm text-secondary-dark">
        Click "Start Project" to create your project and begin working through your action plan.
      </p>
    </div>
  );
}

export default ProjectCreationFlow;
