'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, DollarSign, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskCompletion } from '@/lib/monetization-api';
import { ErrorHandler } from '@/lib/error-handler';

interface Task {
  id: string;
  task: string;
  time: string;
  cost: number;
  details: string;
  decision_type?: string;
}

interface Phase {
  phase: string;
  timeline: string;
  steps: Task[];
}

interface TaskListProps {
  phases: Phase[];
  completedTasks: TaskCompletion[];
  onToggleTask: (taskId: string, completed: boolean, notes?: string) => Promise<void>;
  currentPhaseIndex: number;
}

export function TaskList({ phases, completedTasks, onToggleTask, currentPhaseIndex }: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completedTaskIds = new Set(completedTasks.map(t => t.task_id));

  const handleTaskClick = (task: Task, phaseIndex: number) => {
    setSelectedTask(task);
    const existing = completedTasks.find(t => t.task_id === task.id);
    setNotes(existing?.notes || '');
  };

  const handleToggle = async (taskId: string, completed: boolean) => {
    setIsSubmitting(true);
    const result = await ErrorHandler.withErrorHandling(
      async () => {
        await onToggleTask(taskId, completed, notes);
        
        // Show success toast
        ErrorHandler.success(
          completed ? 'Task completed ✓' : 'Task marked incomplete',
          completed ? '✅' : '⭕'
        );
        
        setSelectedTask(null);
        setNotes('');
        return true;
      },
      'Updating task'
    );
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {phases.map((phase, phaseIndex) => {
        const phaseTasks = phase.steps;
        const completedInPhase = phaseTasks.filter(t => completedTaskIds.has(t.id)).length;
        const progressPercent = (completedInPhase / phaseTasks.length) * 100;
        const isCurrentPhase = phaseIndex === currentPhaseIndex;
        const isPastPhase = phaseIndex < currentPhaseIndex;

        return (
          <div
            key={phaseIndex}
            className={cn(
              "dashboard-card p-6 transition-all duration-300",
              isCurrentPhase && "border-2 border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20",
              isPastPhase && "opacity-75"
            )}
          >
            {/* Phase Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                  isCurrentPhase && "bg-gradient-to-br from-purple-600 to-blue-600 ring-4 ring-purple-200 dark:ring-purple-800",
                  isPastPhase && "bg-emerald-600",
                  !isCurrentPhase && !isPastPhase && "bg-gray-400"
                )}>
                  {phaseIndex + 1}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary-dark flex items-center gap-2">
                    {phase.phase}
                    {isCurrentPhase && (
                      <Badge className="bg-purple-600 text-white">Current Phase</Badge>
                    )}
                    {isPastPhase && (
                      <Badge className="bg-emerald-600 text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-secondary-dark">{phase.timeline}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-primary-dark">
                  {completedInPhase}/{phaseTasks.length} tasks
                </div>
                <div className="text-xs text-secondary-dark">{progressPercent.toFixed(0)}% complete</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full mb-4 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  isCurrentPhase && "bg-gradient-to-r from-purple-600 to-blue-600",
                  isPastPhase && "bg-emerald-600",
                  !isCurrentPhase && !isPastPhase && "bg-gray-400"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {phaseTasks.map((task, taskIndex) => {
                const isCompleted = completedTaskIds.has(task.id);
                const completion = completedTasks.find(t => t.task_id === task.id);

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer group",
                      isCompleted && "bg-emerald-50 dark:bg-emerald-950/20"
                    )}
                    onClick={() => handleTaskClick(task, phaseIndex)}
                  >
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={(checked) => handleToggle(task.id, checked as boolean)}
                      className="mt-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium text-primary-dark group-hover:text-purple-600 transition-colors",
                          isCompleted && "line-through text-secondary-dark"
                        )}>
                          {task.task}
                        </p>
                        {task.decision_type && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Decision: {task.decision_type}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-secondary-dark">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{task.time}</span>
                        </div>
                        {task.cost > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>${task.cost}</span>
                          </div>
                        )}
                        {isCompleted && completion && (
                          <Badge variant="secondary" className="text-xs">
                            {completion.completed_via === 'manual' && 'Manually completed'}
                            {completion.completed_via === 'ai_auto' && 'Auto-detected'}
                            {completion.completed_via === 'ai_confirmed' && 'AI confirmed'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Task Details Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {completedTaskIds.has(selectedTask.id) ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
                {selectedTask.task}
              </DialogTitle>
              <DialogDescription>
                Task details and completion notes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Task Details */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-secondary-dark whitespace-pre-wrap">
                  {selectedTask.details}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-secondary-dark" />
                  <span className="text-secondary-dark">Time: {selectedTask.time}</span>
                </div>
                {selectedTask.cost > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-secondary-dark" />
                    <span className="text-secondary-dark">Cost: ${selectedTask.cost}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-dark">
                  Notes (optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this task..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTask(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleToggle(
                    selectedTask.id,
                    !completedTaskIds.has(selectedTask.id)
                  )}
                  disabled={isSubmitting}
                  className={cn(
                    completedTaskIds.has(selectedTask.id) && "bg-orange-600 hover:bg-orange-700"
                  )}
                >
                  {isSubmitting ? (
                    'Saving...'
                  ) : completedTaskIds.has(selectedTask.id) ? (
                    'Mark Incomplete'
                  ) : (
                    'Mark Complete'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
