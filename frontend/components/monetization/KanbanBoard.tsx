'use client';

import { useState, useEffect } from 'react';
import { Loader2, GripVertical, Check, Clock, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getProjectTasks, updateTask, reorderTask } from '@/lib/monetization-v2-api';
import type { Task, TasksByStatus } from '@/types/monetization-v2';

interface KanbanBoardProps {
  projectId: string;
  onTaskUpdate?: () => void;
}

const COLUMNS: { key: 'todo' | 'in_progress' | 'done'; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'todo', label: 'To Do', icon: <Circle className="h-4 w-4" />, color: 'gray' },
  { key: 'in_progress', label: 'In Progress', icon: <Clock className="h-4 w-4" />, color: 'blue' },
  { key: 'done', label: 'Done', icon: <Check className="h-4 w-4" />, color: 'green' },
];

export function KanbanBoard({ projectId, onTaskUpdate }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TasksByStatus>({ todo: [], in_progress: [], done: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1]));
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProjectTasks(projectId);
      setTasks(data);
      
      // Auto-expand phases that have in-progress tasks
      const phasesWithProgress = new Set<number>();
      data.in_progress.forEach(t => phasesWithProgress.add(t.phase));
      if (phasesWithProgress.size > 0) {
        setExpandedPhases(phasesWithProgress);
      }
    } catch (err) {
      setError('Failed to load tasks.');
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: 'todo' | 'in_progress' | 'done') => {
    if (task.status === newStatus) return;
    
    setUpdatingTaskId(task.id);
    try {
      await updateTask(task.id, { status: newStatus });
      await loadTasks();
      onTaskUpdate?.();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const togglePhase = (phase: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  // Group tasks by phase
  const allTasks = [...tasks.todo, ...tasks.in_progress, ...tasks.done];
  const phases = Array.from(new Set(allTasks.map(t => t.phase))).sort((a, b) => a - b);
  const phaseNames = new Map<number, string>();
  allTasks.forEach(t => phaseNames.set(t.phase, t.phase_name));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={loadTasks}>Try Again</Button>
      </div>
    );
  }

  const totalTasks = allTasks.length;
  const completedTasks = tasks.done.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="dashboard-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary-dark">Overall Progress</span>
          <span className="text-sm font-bold text-[var(--brand-primary)]">{progressPercentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--brand-primary)] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-secondary-dark">
          <span>{completedTasks} of {totalTasks} tasks completed</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Circle className="h-3 w-3 text-gray-400" /> {tasks.todo.length} to do
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" /> {tasks.in_progress.length} in progress
            </span>
          </div>
        </div>
      </div>

      {/* Kanban by Phase */}
      <div className="space-y-4">
        {phases.map(phase => {
          const phaseTasks = {
            todo: tasks.todo.filter(t => t.phase === phase),
            in_progress: tasks.in_progress.filter(t => t.phase === phase),
            done: tasks.done.filter(t => t.phase === phase),
          };
          const phaseTotal = phaseTasks.todo.length + phaseTasks.in_progress.length + phaseTasks.done.length;
          const phaseDone = phaseTasks.done.length;
          const phaseProgress = phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0;
          const isExpanded = expandedPhases.has(phase);

          return (
            <div key={phase} className="dashboard-card overflow-hidden">
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center text-sm font-bold">
                    {phase}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-primary-dark">{phaseNames.get(phase)}</div>
                    <div className="text-xs text-secondary-dark">
                      {phaseDone}/{phaseTotal} tasks • {phaseProgress}% complete
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {phaseProgress === 100 && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      Complete
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Phase Tasks */}
              {isExpanded && (
                <div className="border-t border-[var(--border)]">
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
                    {COLUMNS.map(column => (
                      <div key={column.key} className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={cn(
                            'p-1 rounded',
                            column.color === 'gray' && 'text-gray-500 bg-gray-100 dark:bg-gray-800',
                            column.color === 'blue' && 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
                            column.color === 'green' && 'text-green-500 bg-green-100 dark:bg-green-900/30',
                          )}>
                            {column.icon}
                          </span>
                          <span className="text-sm font-medium text-primary-dark">{column.label}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {phaseTasks[column.key].length}
                          </Badge>
                        </div>

                        <div className="space-y-2 min-h-[100px]">
                          {phaseTasks[column.key].map(task => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              isUpdating={updatingTaskId === task.id}
                              onStatusChange={(status) => handleStatusChange(task, status)}
                            />
                          ))}
                          {phaseTasks[column.key].length === 0 && (
                            <div className="text-center py-4 text-sm text-secondary-dark">
                              No tasks
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  isUpdating: boolean;
  onStatusChange: (status: 'todo' | 'in_progress' | 'done') => void;
}

function TaskCard({ task, isUpdating, onStatusChange }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'p-3 rounded-lg border border-[var(--border)] bg-white dark:bg-gray-900 transition-all shadow-sm',
        isUpdating && 'opacity-50',
        task.status === 'done' && 'bg-green-50/50 dark:bg-green-900/10'
      )}
    >
      {/* Phase badge */}
      <div className="text-xs text-secondary-dark mb-1">Phase {task.phase}</div>
      
      {/* Task title */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-left w-full"
      >
        <h4 className={cn(
          'font-medium text-sm mb-1',
          task.status === 'done' ? 'text-secondary-dark line-through' : 'text-primary-dark'
        )}>
          {task.title}
        </h4>
      </button>

      {/* Description (truncated or expanded) */}
      <p className={cn(
        'text-xs text-secondary-dark mb-3',
        isExpanded ? '' : 'line-clamp-2'
      )}>
        {task.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {task.estimated_hours ? (
          <span className="text-xs text-secondary-dark flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {task.estimated_hours}h
          </span>
        ) : (
          <span />
        )}

        {/* Status dropdown */}
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as 'todo' | 'in_progress' | 'done')}
          disabled={isUpdating}
          className={cn(
            'text-xs border rounded px-2 py-1 bg-white dark:bg-gray-800 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-opacity-50',
            isUpdating && 'cursor-not-allowed'
          )}
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      {/* Completed indicator */}
      {task.status === 'done' && task.completed_at && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Completed
        </div>
      )}
    </div>
  );
}

export default KanbanBoard;
