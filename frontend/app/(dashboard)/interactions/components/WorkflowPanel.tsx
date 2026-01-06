'use client';

import { useState, useEffect } from 'react';
import { X, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { WorkflowBuilderV2 } from './WorkflowBuilderV2';
import { WorkflowListV2 } from './WorkflowListV2';
import type { Workflow, View } from '../types/workflow';

interface WorkflowPanelProps {
  viewId: string | null;
  viewName?: string;
  views?: View[];
  onClose: () => void;
  onUpdate?: () => void;
}

export function WorkflowPanel({
  viewId,
  viewName = 'this view',
  views = [],
  onClose,
  onUpdate,
}: WorkflowPanelProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [allViews, setAllViews] = useState<View[]>(views);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    loadWorkflows();
    if (views.length === 0) {
      loadViews();
    }
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await api.get('/workflows');
      // API returns array directly now, ordered by priority
      const data = Array.isArray(response.data) ? response.data : (response.data.workflows || []);
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadViews = async () => {
    try {
      const response = await api.get('/views');
      const data = Array.isArray(response.data) ? response.data : (response.data.views || []);
      setAllViews(data);
    } catch (error) {
      console.error('Failed to load views:', error);
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

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[700px] bg-background border-l border-border shadow-lg flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-brand-primary" />
          <div>
            <h2 className="text-lg font-semibold text-primary-dark">Workflows</h2>
            <p className="text-sm text-secondary-dark">
              Automate responses to incoming messages
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <WorkflowListV2
            workflows={workflows}
            views={allViews}
            onEdit={handleEditWorkflow}
            onRefresh={loadWorkflows}
            onCreateNew={handleCreateWorkflow}
          />
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t px-6 py-4 bg-muted/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary-dark">
            <span className="font-semibold text-brand-primary">{workflows.filter(w => w.status === 'active').length}</span> active
          </span>
          <span className="text-secondary-dark">
            <span className="font-semibold text-primary-dark">{workflows.length}</span> total workflows
          </span>
        </div>
      </div>

      {/* Workflow Builder Modal */}
      {showBuilder && (
        <WorkflowBuilderV2
          existingWorkflow={editingWorkflow}
          views={allViews}
          onClose={handleBuilderClose}
          onSave={handleBuilderSave}
        />
      )}
    </div>
  );
}
