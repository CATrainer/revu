'use client';

import { useState } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit2, 
  Sparkles, 
  Send,
  ChevronUp,
  ChevronDown,
  Plus,
  Zap,
  Shield,
  Archive,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { type Workflow, type View, isSystemWorkflow, SYSTEM_WORKFLOW_AUTO_MODERATOR, SYSTEM_WORKFLOW_AUTO_ARCHIVE } from '../types/workflow';

interface WorkflowListV2Props {
  workflows: Workflow[];
  views: View[];
  onEdit: (workflow: Workflow) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
}

export function WorkflowListV2({ 
  workflows, 
  views,
  onEdit, 
  onRefresh,
  onCreateNew 
}: WorkflowListV2Props) {
  const [deleteWorkflow, setDeleteWorkflow] = useState<Workflow | null>(null);
  const [reordering, setReordering] = useState(false);

  const handleToggleStatus = async (workflow: Workflow) => {
    try {
      if (workflow.status === 'active') {
        await api.post(`/workflows/${workflow.id}/pause`);
      } else {
        await api.post(`/workflows/${workflow.id}/activate`);
      }
      onRefresh();
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteWorkflow) return;
    try {
      await api.delete(`/workflows/${deleteWorkflow.id}`);
      setDeleteWorkflow(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    await reorderWorkflows(index, index - 1);
  };

  const handleMoveDown = async (index: number) => {
    if (index === workflows.length - 1) return;
    await reorderWorkflows(index, index + 1);
  };

  const reorderWorkflows = async (fromIndex: number, toIndex: number) => {
    setReordering(true);
    try {
      const newOrder = [...workflows];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      
      await api.post('/workflows/reorder', {
        workflow_ids: newOrder.map(w => w.id)
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to reorder workflows:', error);
    } finally {
      setReordering(false);
    }
  };

  const getViewNames = (viewIds: string[] | null) => {
    if (!viewIds || viewIds.length === 0) return 'All messages';
    return viewIds
      .map(id => views.find(v => v.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'All messages';
  };

  if (workflows.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-primary-dark mb-2">No Workflows Yet</h3>
        <p className="text-sm text-secondary-dark mb-6 max-w-md mx-auto">
          Create workflows to automatically respond to incoming messages or generate AI responses for your approval.
        </p>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-secondary-dark">
            Priority Order
          </h3>
          <p className="text-xs text-muted-foreground">
            Only one workflow runs per message. Higher priority workflows run first.
          </p>
        </div>
        <Button onClick={onCreateNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Workflow List */}
      <div className="space-y-2">
        {workflows.map((workflow, index) => (
          <div
            key={workflow.id}
            className={cn(
              'flex items-center gap-3 p-4 border rounded-lg bg-card transition-all',
              workflow.status === 'paused' && 'opacity-60',
              reordering && 'pointer-events-none'
            )}
          >
            {/* Priority Controls - disabled for system workflows */}
            <div className="flex flex-col gap-0.5">
              {isSystemWorkflow(workflow) ? (
                <div className="h-12 w-6 flex items-center justify-center">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || reordering || isSystemWorkflow(workflows[index - 1])}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === workflows.length - 1 || reordering}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Priority Number with system workflow indicator */}
            <div className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium",
              isSystemWorkflow(workflow) 
                ? workflow.system_workflow_type === SYSTEM_WORKFLOW_AUTO_MODERATOR
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-muted"
            )}>
              {isSystemWorkflow(workflow) ? (
                workflow.system_workflow_type === SYSTEM_WORKFLOW_AUTO_MODERATOR 
                  ? <Shield className="h-4 w-4" />
                  : <Archive className="h-4 w-4" />
              ) : (
                workflow.priority
              )}
            </div>

            {/* Workflow Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-primary-dark truncate">
                  {workflow.name}
                </span>
                {isSystemWorkflow(workflow) && (
                  <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400">
                    System
                  </Badge>
                )}
                <Badge 
                  variant={workflow.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {workflow.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-secondary-dark">
                {/* Action Type */}
                <span className="flex items-center gap-1">
                  {workflow.system_workflow_type === SYSTEM_WORKFLOW_AUTO_MODERATOR ? (
                    <>
                      <Shield className="h-3 w-3 text-red-500" />
                      Block/Delete
                    </>
                  ) : workflow.system_workflow_type === SYSTEM_WORKFLOW_AUTO_ARCHIVE ? (
                    <>
                      <Archive className="h-3 w-3 text-amber-500" />
                      Archive
                    </>
                  ) : workflow.action_type === 'generate_response' ? (
                    <>
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      Generate Response
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3 text-green-500" />
                      Auto-Respond
                    </>
                  )}
                </span>
                
                <span className="text-muted-foreground">•</span>
                
                {/* Scope */}
                <span className="truncate">
                  {getViewNames(workflow.view_ids)}
                </span>
                
                {/* AI Conditions indicator */}
                {workflow.ai_conditions && workflow.ai_conditions.length > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="flex items-center gap-1 text-purple-600">
                      <Sparkles className="h-3 w-3" />
                      {workflow.ai_conditions.length} AI {workflow.ai_conditions.length === 1 ? 'condition' : 'conditions'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleToggleStatus(workflow)}
                title={workflow.status === 'active' ? 'Pause workflow' : 'Activate workflow'}
              >
                {workflow.status === 'active' ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onEdit(workflow)}
                title="Edit workflow"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              
              {!isSystemWorkflow(workflow) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteWorkflow(workflow)}
                  title="Delete workflow"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>How priority works:</strong> When a new message arrives, workflows are checked from top to bottom. 
          The first matching workflow runs, and no other workflows are evaluated for that message.
        </p>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteWorkflow} onOpenChange={() => setDeleteWorkflow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteWorkflow?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
