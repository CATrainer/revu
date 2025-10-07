'use client';

import { Plus, X, Send, Flag, Tag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Action {
  type: string;
  config: any;
}

interface ActionsStepProps {
  actions: Action[];
  onUpdate: (actions: Action[]) => void;
}

const ACTION_TYPES = [
  {
    value: 'auto_respond',
    label: 'Auto-Respond',
    icon: Send,
    description: 'Automatically send a response',
    color: 'text-green-600',
  },
  {
    value: 'generate_response',
    label: 'Generate Response (Approval)',
    icon: Sparkles,
    description: 'AI generates response for your approval',
    color: 'text-purple-600',
  },
  {
    value: 'flag_for_review',
    label: 'Flag for Review',
    icon: Flag,
    description: 'Mark interaction for manual review',
    color: 'text-orange-600',
  },
  {
    value: 'add_tag',
    label: 'Add Tag',
    icon: Tag,
    description: 'Automatically tag the interaction',
    color: 'text-blue-600',
  },
];

export function ActionsStep({ actions, onUpdate }: ActionsStepProps) {
  const addAction = (type: string) => {
    const defaultConfig: any = {};
    
    if (type === 'auto_respond' || type === 'generate_response') {
      defaultConfig.message = '';
      defaultConfig.tone = 'friendly';
    } else if (type === 'add_tag') {
      defaultConfig.tags = [];
    } else if (type === 'flag_for_review') {
      defaultConfig.priority = 'normal';
    }

    onUpdate([...actions, { type, config: defaultConfig }]);
  };

  const removeAction = (index: number) => {
    onUpdate(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, config: any) => {
    const updated = [...actions];
    updated[index].config = { ...updated[index].config, ...config };
    onUpdate(updated);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-lg font-semibold text-primary-dark mb-4">
          What actions should be taken?
        </h3>
        <p className="text-sm text-secondary-dark">
          Define what happens when the trigger and conditions are met.
        </p>
      </div>

      {actions.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8">
          <p className="text-sm text-secondary-dark mb-4 text-center">
            Add at least one action to complete your workflow
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ACTION_TYPES.map((actionType) => {
              const Icon = actionType.icon;
              return (
                <button
                  key={actionType.value}
                  onClick={() => addAction(actionType.value)}
                  className="flex flex-col items-center gap-2 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Icon className={cn('h-6 w-6', actionType.color)} />
                  <div className="text-center">
                    <p className="text-sm font-medium text-primary-dark">
                      {actionType.label}
                    </p>
                    <p className="text-xs text-secondary-dark mt-1">
                      {actionType.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action, index) => {
            const actionType = ACTION_TYPES.find(t => t.value === action.type);
            if (!actionType) return null;

            const Icon = actionType.icon;

            return (
              <div key={index} className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-5 w-5', actionType.color)} />
                    <div>
                      <p className="text-sm font-medium text-primary-dark">
                        {actionType.label}
                      </p>
                      <p className="text-xs text-secondary-dark">
                        {actionType.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAction(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-4 space-y-3">
                  {(action.type === 'auto_respond' || action.type === 'generate_response') && (
                    <>
                      <div>
                        <Label>Response Message</Label>
                        <Textarea
                          value={action.config.message || ''}
                          onChange={(e) => updateAction(index, { message: e.target.value })}
                          placeholder={
                            action.type === 'auto_respond'
                              ? 'Enter the response message to send...'
                              : 'Enter instructions for AI response generation...'
                          }
                          className="mt-1.5"
                          rows={3}
                        />
                        {action.type === 'generate_response' && (
                          <p className="text-xs text-secondary-dark mt-1.5">
                            AI will use this as context to generate a personalized response
                          </p>
                        )}
                      </div>

                      <div>
                        <Label>Tone</Label>
                        <Select
                          value={action.config.tone || 'friendly'}
                          onValueChange={(value) => updateAction(index, { tone: value })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="formal">Formal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {action.type === 'add_tag' && (
                    <div>
                      <Label>Tags to Add</Label>
                      <Input
                        value={action.config.tags?.join(', ') || ''}
                        onChange={(e) =>
                          updateAction(index, {
                            tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                          })
                        }
                        placeholder="Enter tags separated by commas"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-secondary-dark mt-1.5">
                        Separate multiple tags with commas
                      </p>
                    </div>
                  )}

                  {action.type === 'flag_for_review' && (
                    <div>
                      <Label>Priority Level</Label>
                      <Select
                        value={action.config.priority || 'normal'}
                        onValueChange={(value) => updateAction(index, { priority: value })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="normal">Normal Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="border-t border-border pt-4">
            <Label>Add Another Action</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ACTION_TYPES.filter(at => !actions.some(a => a.type === at.value)).map((actionType) => {
                const Icon = actionType.icon;
                return (
                  <Button
                    key={actionType.value}
                    variant="outline"
                    onClick={() => addAction(actionType.value)}
                    className="justify-start"
                  >
                    <Icon className={cn('h-4 w-4 mr-2', actionType.color)} />
                    {actionType.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
