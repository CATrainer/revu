'use client';

import { Check, Zap, Filter, PlayCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewStepProps {
  workflowData: {
    name: string;
    description: string;
    is_global: boolean;
    trigger: any;
    conditions: any[];
    actions: any[];
  };
}

export function ReviewStep({ workflowData }: ReviewStepProps) {
  const hasConditions = workflowData.conditions.length > 0;
  const hasActions = workflowData.actions.length > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-lg font-semibold text-primary-dark mb-4">
          Review Your Workflow
        </h3>
        <p className="text-sm text-secondary-dark">
          Review the workflow configuration before saving.
        </p>
      </div>

      {/* Workflow Summary */}
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-brand-primary" />
            <h4 className="font-medium text-primary-dark">Basic Information</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-dark">Name:</span>
              <span className="font-medium text-primary-dark">{workflowData.name}</span>
            </div>
            {workflowData.description && (
              <div className="flex justify-between">
                <span className="text-secondary-dark">Description:</span>
                <span className="font-medium text-primary-dark">{workflowData.description}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-secondary-dark">Scope:</span>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                workflowData.is_global
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
              )}>
                {workflowData.is_global ? 'Global' : 'View-Specific'}
              </span>
            </div>
          </div>
        </div>

        {/* Trigger */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-primary-dark">Trigger</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-dark">Event:</span>
              <span className="font-medium text-primary-dark">
                {workflowData.trigger.type === 'new_interaction' && 'New Interaction Received'}
                {workflowData.trigger.type === 'interaction_updated' && 'Interaction Updated'}
                {workflowData.trigger.type === 'manual' && 'Manual Trigger'}
              </span>
            </div>
            {workflowData.trigger.platforms && workflowData.trigger.platforms.length > 0 && (
              <div className="flex justify-between">
                <span className="text-secondary-dark">Platforms:</span>
                <span className="font-medium text-primary-dark">
                  {workflowData.trigger.platforms.join(', ')}
                </span>
              </div>
            )}
            {workflowData.trigger.interaction_types && workflowData.trigger.interaction_types.length > 0 && (
              <div className="flex justify-between">
                <span className="text-secondary-dark">Types:</span>
                <span className="font-medium text-primary-dark">
                  {workflowData.trigger.interaction_types.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Conditions */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-primary-dark">Conditions</h4>
          </div>
          {hasConditions ? (
            <div className="space-y-2">
              {workflowData.conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-secondary-dark">
                    {condition.field} {condition.operator} "{condition.value}"
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-secondary-dark">No conditions - will match all triggers</p>
          )}
        </div>

        {/* Actions */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h4 className="font-medium text-primary-dark">Actions</h4>
          </div>
          {hasActions ? (
            <div className="space-y-2">
              {workflowData.actions.map((action, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-primary-dark">
                      {action.type === 'auto_respond' && 'Auto-Respond'}
                      {action.type === 'generate_response' && 'Generate Response (Approval)'}
                      {action.type === 'flag_for_review' && 'Flag for Review'}
                      {action.type === 'add_tag' && 'Add Tag'}
                    </p>
                    {(action.type === 'auto_respond' || action.type === 'generate_response') && action.config.message && (
                      <p className="text-xs text-secondary-dark mt-1 italic">
                        "{action.config.message.substring(0, 100)}{action.config.message.length > 100 ? '...' : ''}"
                      </p>
                    )}
                    {action.type === 'add_tag' && action.config.tags && (
                      <p className="text-xs text-secondary-dark mt-1">
                        Tags: {action.config.tags.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-red-600">No actions configured - workflow will do nothing</p>
          )}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Check className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
              Workflow is ready to save!
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              When activated, this workflow will {workflowData.trigger.type === 'new_interaction' ? 'automatically run' : 'run'} when 
              {hasConditions ? ' the conditions match' : ' triggered'} and perform {workflowData.actions.length} action{workflowData.actions.length !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
