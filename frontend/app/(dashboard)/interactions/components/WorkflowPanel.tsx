'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Zap, Play, Pause, Edit2, Trash2, MoreVertical, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorkflowBuilder } from './WorkflowBuilder';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: string;  // 'active' | 'paused' | 'draft'
  is_global: boolean;
  view_id?: string;
  created_at: string;
  trigger?: any;
  conditions?: any;
  actions?: any;
}

interface WorkflowPanelProps {
  viewId: string | null;
  viewName?: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export function WorkflowPanel({
  viewId,
  viewName = 'this view',
  onClose,
  onUpdate,
}: WorkflowPanelProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, [viewId]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await api.get('/workflows');
      const data = response.data;
      
      // Filter workflows: global + view-specific
      const allWorkflows = data.workflows || [];
      const filtered = allWorkflows.filter((w: Workflow) => 
        w.is_global || w.view_id === viewId
      );
      
      setWorkflows(filtered);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (workflowId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await api.patch(`/workflows/${workflowId}`, { status: newStatus });
      await loadWorkflows();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      await api.delete(`/workflows/${workflowId}`);
      await loadWorkflows();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleCreateWorkflow = () => {
    setEditingWorkflow(null);
    setShowBuilder(true);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setShowBuilder(true);
  };

  const handleBuilderClose = () => {
    setShowBuilder(false);
    setEditingWorkflow(null);
  };

  const handleBuilderSave = () => {
    loadWorkflows();
    onUpdate?.();
  };

  const globalWorkflows = workflows.filter(w => w.is_global);
  const viewWorkflows = workflows.filter(w => !w.is_global && w.view_id === viewId);

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[700px] bg-background border-l border-border shadow-lg flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-brand-primary" />
          <div>
            <h2 className="text-lg font-semibold text-primary-dark">Workflows</h2>
            <p className="text-sm text-secondary-dark">
              Automate interactions for {viewName}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* View-Specific Workflows */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-primary-dark">
                    Workflows for {viewName}
                  </h3>
                  <Button size="sm" onClick={handleCreateWorkflow}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Workflow
                  </Button>
                </div>

                {viewWorkflows.length === 0 ? (
                  <div className="text-center py-12 text-secondary-dark">
                    <Zap className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No workflows for this view yet</p>
                    <p className="text-xs mt-1">Create a workflow to automate interactions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {viewWorkflows.map((workflow) => (
                      <WorkflowCard
                        key={workflow.id}
                        workflow={workflow}
                        onToggleStatus={handleToggleStatus}
                        onEdit={handleEditWorkflow}
                        onDelete={handleDeleteWorkflow}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Global Workflows */}
            {globalWorkflows.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="h-4 w-4 text-brand-primary" />
                    <h3 className="text-base font-semibold text-primary-dark">
                      Global Workflows
                    </h3>
                    <span className="text-xs text-secondary-dark">(Apply to all views)</span>
                  </div>

                  <div className="space-y-3">
                    {globalWorkflows.map((workflow) => (
                      <WorkflowCard
                        key={workflow.id}
                        workflow={workflow}
                        onToggleStatus={handleToggleStatus}
                        onEdit={handleEditWorkflow}
                        onDelete={handleDeleteWorkflow}
                        isGlobal
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t px-6 py-4 bg-muted/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary-dark">
            <span className="font-semibold text-brand-primary">{workflows.filter(w => w.status === 'active').length}</span> active
          </span>
          <span className="text-secondary-dark">
            <span className="font-semibold text-primary-dark">{workflows.length}</span> total
          </span>
        </div>
      </div>

      {/* Workflow Builder Modal */}
      {showBuilder && (
        <WorkflowBuilder
          viewId={viewId}
          viewName={viewName}
          existingWorkflow={editingWorkflow}
          onClose={handleBuilderClose}
          onSave={handleBuilderSave}
        />
      )}
    </div>
  );
}

// Workflow Card Component
interface WorkflowCardProps {
  workflow: Workflow;
  onToggleStatus: (id: string, status: string) => void;
  onEdit: (workflow: Workflow) => void;
  onDelete: (id: string) => void;
  isGlobal?: boolean;
}

function WorkflowCard({ workflow, onToggleStatus, onEdit, onDelete, isGlobal }: WorkflowCardProps) {
  const isActive = workflow.status === 'active';

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      isActive ? "bg-card border-brand-primary/30" : "bg-muted/50 border-border opacity-60"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center",
          isActive ? "bg-brand-primary/10" : "bg-muted"
        )}>
          <Zap className={cn(
            "h-4 w-4",
            isActive ? "text-brand-primary" : "text-secondary-dark"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-primary-dark truncate">
              {workflow.name}
            </h4>
            {isGlobal && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Globe className="h-3 w-3" />
                Global
              </span>
            )}
            <span className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
              isActive
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            )}>
              {isActive ? 'Active' : 'Paused'}
            </span>
          </div>

          {workflow.description && (
            <p className="text-xs text-secondary-dark line-clamp-1 mb-2">
              {workflow.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-secondary-dark">
            <span>Created {new Date(workflow.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggleStatus(workflow.id, workflow.status)}>
              {isActive ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(workflow)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => onDelete(workflow.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
