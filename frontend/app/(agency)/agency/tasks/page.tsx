'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  MoreHorizontal,
  Trash2,
  Edit,
  CalendarDays,
  Loader2,
  User,
  Flag,
  ChevronDown,
  ListTodo,
  Play,
  Pause,
} from 'lucide-react';
import { taskApi, type Task, type TaskStatus, type TaskPriority } from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';

// Priority config
const priorityConfig: Record<TaskPriority, { label: string; color: string; icon: React.ReactNode }> = {
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-100 dark:bg-red-900/30', icon: <Flag className="h-3 w-3 text-red-600" /> },
  high: { label: 'High', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30', icon: <Flag className="h-3 w-3 text-orange-600" /> },
  normal: { label: 'Normal', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', icon: <Flag className="h-3 w-3 text-blue-600" /> },
  low: { label: 'Low', color: 'text-gray-500 bg-gray-100 dark:bg-gray-800', icon: <Flag className="h-3 w-3 text-gray-500" /> },
};

// Status config
const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  todo: { label: 'To Do', color: 'text-gray-600 bg-gray-100 dark:bg-gray-800', icon: <Circle className="h-4 w-4" /> },
  in_progress: { label: 'In Progress', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', icon: <Play className="h-4 w-4" /> },
  blocked: { label: 'Blocked', color: 'text-red-600 bg-red-100 dark:bg-red-900/30', icon: <Pause className="h-4 w-4" /> },
  completed: { label: 'Completed', color: 'text-green-600 bg-green-100 dark:bg-green-900/30', icon: <CheckCircle2 className="h-4 w-4" /> },
  cancelled: { label: 'Cancelled', color: 'text-gray-400 bg-gray-100 dark:bg-gray-800', icon: <Circle className="h-4 w-4" /> },
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Form state for new task
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    priority: 'normal' as TaskPriority,
    due_date: '',
  });

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['agency-tasks', showCompleted, statusFilter, priorityFilter],
    queryFn: () => taskApi.getTasks({
      include_completed: showCompleted,
      status: statusFilter !== 'all' ? statusFilter as TaskStatus : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter as TaskPriority : undefined,
    }),
  });

  const tasks = tasksData?.tasks || [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tasks'] });
      setShowNewTaskDialog(false);
      setNewTaskForm({ title: '', description: '', priority: 'normal', due_date: '' });
      toast.success('Task created');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create task');
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: taskApi.completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tasks'] });
      toast.success('Task completed');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to complete task');
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      taskApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tasks'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update task');
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: taskApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tasks'] });
      toast.success('Task deleted');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete task');
    },
  });

  // Handle create task
  const handleCreateTask = () => {
    if (!newTaskForm.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    createTaskMutation.mutate({
      title: newTaskForm.title,
      description: newTaskForm.description || undefined,
      priority: newTaskForm.priority,
      due_date: newTaskForm.due_date || undefined,
    });
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Group tasks by status
  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    blocked: filteredTasks.filter(t => t.status === 'blocked'),
    completed: filteredTasks.filter(t => t.status === 'completed'),
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    }
  };

  // Check if date is overdue
  const isOverdue = (dateString: string | undefined) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-500 dark:text-gray-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Track and manage agency tasks
          </p>
        </div>
        <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to track
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Title *</Label>
                <Input
                  id="task-title"
                  placeholder="e.g., Send contract to Brand X"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  placeholder="Add details..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Priority</Label>
                  <Select
                    value={newTaskForm.priority}
                    onValueChange={(value) => setNewTaskForm(f => ({ ...f, priority: value as TaskPriority }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-due-date">Due Date</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={newTaskForm.due_date}
                    onChange={(e) => setNewTaskForm(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleCreateTask}
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Task'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Checkbox
            checked={showCompleted}
            onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
          />
          Show completed
        </label>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Circle className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasksByStatus.todo.length}</p>
                <p className="text-sm text-gray-500">To Do</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Play className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasksByStatus.in_progress.length}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Pause className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasksByStatus.blocked.length}</p>
                <p className="text-sm text-gray-500">Blocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasksByStatus.completed.length}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Tasks ({filteredTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No tasks found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery ? 'Try a different search' : 'Create your first task to get started'}
              </p>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowNewTaskDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                    task.status === 'completed' && "opacity-60"
                  )}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => {
                      if (checked && task.status !== 'completed') {
                        completeTaskMutation.mutate(task.id);
                      } else if (!checked && task.status === 'completed') {
                        updateTaskMutation.mutate({ id: task.id, data: { status: 'todo' } });
                      }
                    }}
                    className="mt-1"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={cn(
                        "font-medium text-gray-900 dark:text-gray-100",
                        task.status === 'completed' && "line-through"
                      )}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={priorityConfig[task.priority].color}>
                          {priorityConfig[task.priority].icon}
                          <span className="ml-1">{priorityConfig[task.priority].label}</span>
                        </Badge>
                        <Badge className={statusConfig[task.status].color}>
                          {statusConfig[task.status].label}
                        </Badge>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {task.due_date && (
                        <div className={cn(
                          "flex items-center gap-1",
                          isOverdue(task.due_date) && task.status !== 'completed' && "text-red-600"
                        )}>
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(task.due_date)}</span>
                          {isOverdue(task.due_date) && task.status !== 'completed' && (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                        </div>
                      )}
                      {task.is_auto_generated && (
                        <Badge variant="outline" className="text-xs">
                          Auto-generated
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        updateTaskMutation.mutate({ id: task.id, data: { status: 'in_progress' } });
                      }}>
                        <Play className="mr-2 h-4 w-4" />
                        Start Task
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        completeTaskMutation.mutate(task.id);
                      }}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark Complete
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          if (confirm('Delete this task?')) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
