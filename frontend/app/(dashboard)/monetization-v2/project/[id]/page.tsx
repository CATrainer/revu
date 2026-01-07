'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Settings, Trash2, Loader2, Pause, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { cn } from '@/lib/utils';
import { getProject, updateProject, deleteProject } from '@/lib/monetization-v2-api';
import { KanbanBoard } from '@/components/monetization/KanbanBoard';
import type { ProjectDetail } from '@/types/monetization-v2';
import { CATEGORY_INFO } from '@/types/monetization-v2';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
    } catch (err) {
      setError('Failed to load project.');
      console.error('Error loading project:', err);
    } finally {
      setIsLoading(false);
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
        <Progress value={project.progress.percentage} className="h-3 mb-4" />
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary-dark">{project.progress.total}</div>
            <div className="text-xs text-secondary-dark">Total Tasks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-500">{project.progress.todo}</div>
            <div className="text-xs text-secondary-dark">To Do</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-500">{project.progress.in_progress}</div>
            <div className="text-xs text-secondary-dark">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500">{project.progress.done}</div>
            <div className="text-xs text-secondary-dark">Done</div>
          </div>
        </div>
      </div>

      {/* Decision Values Summary */}
      {Object.keys(project.decision_values).length > 0 && (
        <div className="dashboard-card p-6">
          <h2 className="text-lg font-semibold text-primary-dark mb-4">Your Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(project.decision_values).map(([key, value]) => (
              <div key={key} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-secondary-dark capitalize">
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="text-sm font-medium text-primary-dark mt-1">
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div>
        <h2 className="text-lg font-semibold text-primary-dark mb-4">Task Board</h2>
        <KanbanBoard projectId={projectId} onTaskUpdate={loadProject} />
      </div>
    </div>
  );
}
