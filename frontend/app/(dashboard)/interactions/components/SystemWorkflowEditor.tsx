'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Shield, Archive, Sparkles, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { 
  type Workflow, 
  SYSTEM_WORKFLOW_AUTO_MODERATOR, 
  SYSTEM_WORKFLOW_AUTO_ARCHIVE,
  SYSTEM_WORKFLOW_EXAMPLES 
} from '../types/workflow';

interface SystemWorkflowEditorProps {
  workflow: Workflow;
  onClose: () => void;
  onSave: () => void;
}

export function SystemWorkflowEditor({
  workflow,
  onClose,
  onSave,
}: SystemWorkflowEditorProps) {
  const [saving, setSaving] = useState(false);
  const [conditions, setConditions] = useState<string[]>(workflow.ai_conditions || []);
  const [isActive, setIsActive] = useState(workflow.status === 'active');
  const [newCondition, setNewCondition] = useState('');

  const isAutoModerator = workflow.system_workflow_type === SYSTEM_WORKFLOW_AUTO_MODERATOR;
  const examples = workflow.system_workflow_type 
    ? SYSTEM_WORKFLOW_EXAMPLES[workflow.system_workflow_type] 
    : [];

  const handleAddCondition = () => {
    if (newCondition.trim()) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleAddExample = (example: string) => {
    if (!conditions.includes(example)) {
      setConditions([...conditions, example]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await api.patch(`/workflows/${workflow.id}`, {
        ai_conditions: conditions,
        status: isActive ? 'active' : 'paused',
      });
      
      onSave();
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setSaving(false);
    }
  };

  const hasConditions = conditions.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={cn(
          "px-6 py-4 border-b flex items-center justify-between",
          isAutoModerator 
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              isAutoModerator 
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-amber-100 dark:bg-amber-900/30"
            )}>
              {isAutoModerator ? (
                <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary-dark flex items-center gap-2">
                {workflow.name}
                <Badge variant="outline" className="text-xs">System Workflow</Badge>
              </h2>
              <p className="text-sm text-secondary-dark">
                {isAutoModerator 
                  ? "Automatically handles harassment, spam, and inappropriate content"
                  : "Automatically archives interactions that don't need a response"
                }
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base font-medium">Workflow Status</Label>
              <p className="text-sm text-secondary-dark">
                {isActive 
                  ? "This workflow is active and will process matching messages"
                  : "This workflow is paused and won't process any messages"
                }
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Warning if no conditions */}
          {!hasConditions && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  No activation conditions set
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  This workflow won't run until you add at least one condition below.
                </p>
              </div>
            </div>
          )}

          {/* Action Info */}
          <div className="p-4 border rounded-lg bg-card">
            <Label className="text-sm font-medium text-secondary-dark uppercase tracking-wide">
              What This Workflow Does
            </Label>
            {isAutoModerator ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    DMs
                  </Badge>
                  <span>→ Blocks the user on the platform</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Comments
                  </Badge>
                  <span>→ Deletes the comment</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Mentions
                  </Badge>
                  <span>→ Blocks the user</span>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm">
                  Archives the interaction locally so it doesn't appear in your inbox. 
                  The message is <strong>not</strong> deleted from the platform.
                </p>
              </div>
            )}
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Activation Conditions</Label>
              <p className="text-sm text-secondary-dark mt-1">
                Describe what messages should trigger this workflow. Uses AI to understand natural language.
                <span className="text-purple-600 dark:text-purple-400 ml-1">
                  Multiple conditions use OR logic.
                </span>
              </p>
            </div>

            {/* Current Conditions */}
            {conditions.length > 0 && (
              <div className="space-y-2">
                {conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg"
                  >
                    <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <span className="flex-1 text-sm">{condition}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveCondition(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Condition */}
            <div className="flex gap-2">
              <Input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="e.g., Messages containing spam or promotional content"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCondition()}
              />
              <Button onClick={handleAddCondition} disabled={!newCondition.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Example Conditions */}
            {examples.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-secondary-dark flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Suggested conditions (click to add)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {examples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleAddExample(example)}
                      disabled={conditions.includes(example)}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full border transition-colors",
                        conditions.includes(example)
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-background hover:bg-muted border-border hover:border-purple-300"
                      )}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            System workflows have fixed actions and priority
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
