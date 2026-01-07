'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Settings, Trash2, Loader2, Pause, Play, CheckCircle, AlertCircle, Sparkles, RefreshCw, Edit2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getProject, updateProject, deleteProject, getTemplate } from '@/lib/monetization-v2-api';
import { KanbanBoard } from '@/components/monetization/KanbanBoard';
import { AIPartnerChat } from '@/components/monetization/AIPartnerChat';
import type { ProjectDetail, TemplateDetail, DecisionPoint } from '@/types/monetization-v2';
import { CATEGORY_INFO } from '@/types/monetization-v2';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDecisionEditor, setShowDecisionEditor] = useState(false);
  const [editingDecisions, setEditingDecisions] = useState<Record<string, string | number | boolean>>({});

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProject(projectId);
      setProject(data);
      
      // Load template for decision point metadata
      if (data.template_id) {
        try {
          const templateData = await getTemplate(data.template_id);
          setTemplate(templateData);
        } catch (err) {
          console.error('Error loading template:', err);
        }
      }
    } catch (err) {
      setError('Failed to load project.');
      console.error('Error loading project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProject = async () => {
    setIsRefreshing(true);
    try {
      const data = await getProject(projectId);
      setProject(data);
    } catch (err) {
      console.error('Error refreshing project:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const openDecisionEditor = () => {
    if (project) {
      setEditingDecisions({ ...project.decision_values });
      setShowDecisionEditor(true);
    }
  };

  const handleSaveDecisions = async () => {
    if (!project) return;
    
    setIsUpdating(true);
    try {
      const updated = await updateProject(projectId, { decision_values: editingDecisions });
      setProject(updated);
      setShowDecisionEditor(false);
      
      // Refresh after a delay to get AI-customized tasks
      setTimeout(() => {
        refreshProject();
      }, 3000);
    } catch (err) {
      console.error('Error updating decisions:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'paused' | 'completed' | 'abandoned') => {
    if (!project) return;
    
    setIsUpdating(true);
    try {
      const updated = await updateProject(projectId, { status: newStatus });
      setProject(updated);
    } catch (err) {
      console.error('Error updating project:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject(projectId);
      router.push('/monetization-v2');
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error || 'Project not found'}</p>
          <Button onClick={() => router.push('/monetization-v2')}>Back to Projects</Button>
        </div>
      </div>
    );
  }

  const categoryInfo = project.template 
    ? CATEGORY_INFO[project.template.category] || { icon: '📋', label: 'Project' }
    : { icon: '📋', label: 'Project' };

  const statusColors = {
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    abandoned: 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300',
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/monetization-v2')}
            className="w-fit px-0 text-secondary-dark hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          
          <div className="flex items-start gap-4">
            <span className="text-4xl">{categoryInfo.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-primary-dark">{project.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={statusColors[project.status]}>
                  {project.status}
                </Badge>
                {project.template && (
                  <span className="text-sm text-secondary-dark">
                    Based on: {project.template.title}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {project.status === 'active' && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('paused')}
              disabled={isUpdating}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          {project.status === 'paused' && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('active')}
              disabled={isUpdating}
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          {project.status !== 'completed' && project.progress.percentage === 100 && (
            <Button
              onClick={() => handleStatusChange('completed')}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this project and all its tasks. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="dashboard-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary-dark">Project Progress</h2>
          <span className="text-2xl font-bold text-[var(--brand-primary)]">
            {project.progress.percentage}%
          </span>
        </div>
        
        {/* Overall progress bar */}
        <Progress value={project.progress.percentage} className="h-3 mb-4" />
        
        {/* Task counts */}
        <div className="flex items-center justify-between text-sm text-secondary-dark mb-6">
          <span>{project.progress.done}/{project.progress.total} tasks complete</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" /> {project.progress.todo} to do
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> {project.progress.in_progress} in progress
            </span>
          </div>
        </div>
        
        {/* Phase-by-phase progress */}
        {project.progress.by_phase && project.progress.by_phase.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-[var(--border)]">
            {project.progress.by_phase.map((phase) => (
              <div key={phase.phase} className="flex items-center gap-4">
                <div className="w-32 text-sm text-secondary-dark truncate">
                  Phase {phase.phase}: {phase.phase_name}
                </div>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      phase.percentage === 100 ? 'bg-green-500' : 'bg-[var(--brand-primary)]'
                    )}
                    style={{ width: `${phase.percentage}%` }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-medium text-primary-dark">
                  {phase.percentage}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Customization Notes */}
      {project.ai_customization_notes && (
        <div className="dashboard-card p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-primary-dark mb-1">AI Customization</h3>
              <p className="text-sm text-secondary-dark">{project.ai_customization_notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Decision Values Summary */}
      {(Object.keys(project.decision_values).length > 0 || (template && template.decision_points.length > 0)) && (
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary-dark">Your Configuration</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshProject}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openDecisionEditor}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
          {Object.keys(project.decision_values).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(project.decision_values).map(([key, value]) => {
                const dp = template?.decision_points.find(d => d.key === key);
                const label = dp?.label || key.replace(/_/g, ' ');
                let displayValue = String(value);
                
                if (dp?.type === 'select' && dp.options) {
                  const option = dp.options.find(o => o.value === value);
                  if (option) displayValue = option.label;
                } else if (dp?.type === 'boolean' || typeof value === 'boolean') {
                  displayValue = value ? 'Yes' : 'No';
                }
                
                return (
                  <div key={key} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-xs text-secondary-dark capitalize">
                      {label}
                    </div>
                    <div className="text-sm font-medium text-primary-dark mt-1">
                      {displayValue}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-secondary-dark">
              No configuration options set. Click "Edit" to configure your project.
            </p>
          )}
        </div>
      )}

      {/* Decision Editor Dialog */}
      <Dialog open={showDecisionEditor} onOpenChange={setShowDecisionEditor}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Configuration</DialogTitle>
            <DialogDescription>
              Update your project configuration. Changes will trigger AI re-customization of affected tasks.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {template?.decision_points.map((dp) => (
              <DecisionPointEditor
                key={dp.key}
                decisionPoint={dp}
                value={editingDecisions[dp.key]}
                onChange={(value) => setEditingDecisions(prev => ({ ...prev, [dp.key]: value }))}
              />
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecisionEditor(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDecisions} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kanban Board and AI Partner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kanban Board - 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-primary-dark mb-4">Task Board</h2>
          <KanbanBoard projectId={projectId} onTaskUpdate={loadProject} />
        </div>

        {/* AI Partner Chat - 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <div className="dashboard-card h-[600px] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-primary-dark">AI Partner</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIPartnerChat
                projectId={projectId}
                projectTitle={project.title}
                onActionExecuted={loadProject}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ==================== Decision Point Editor ====================

interface DecisionPointEditorProps {
  decisionPoint: DecisionPoint;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}

function DecisionPointEditor({ decisionPoint, value, onChange }: DecisionPointEditorProps) {
  const { key, label, type, options } = decisionPoint;

  return (
    <div className="space-y-2">
      <label htmlFor={key} className="text-sm font-medium text-primary-dark">
        {label}
      </label>

      {type === 'select' && options && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'p-3 rounded-lg border-2 text-left transition-all text-sm',
                value === option.value
                  ? 'border-[var(--brand-primary)] bg-purple-50 dark:bg-purple-950/20'
                  : 'border-[var(--border)] hover:border-gray-300'
              )}
            >
              {option.label}
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={cn(
              'px-4 py-2 rounded-lg border-2 transition-all text-sm',
              value === true
                ? 'border-[var(--brand-primary)] bg-purple-50 dark:bg-purple-950/20'
                : 'border-[var(--border)] hover:border-gray-300'
            )}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={cn(
              'px-4 py-2 rounded-lg border-2 transition-all text-sm',
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
