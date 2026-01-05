'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  MoreHorizontal,
  Trash2,
  Edit,
  Loader2,
  User,
  Flag,
  ListTodo,
  Play,
  Eye,
  MessageSquare,
  ChevronRight,
  GripVertical,
  LayoutGrid,
  List,
  X,
  Save,
  ArrowRight,
} from 'lucide-react';
import { taskApi, type Task, type TaskStatus, type TaskPriority } from '@/lib/agency-dashboard-api';
import { agencyApi, type AgencyMember } from '@/lib/agency-api';
import { toast } from 'sonner';

// Map API statuses to user-friendly labels per requirements
// Requirements: "To Do, In Progress, Review, Done"
type DisplayStatus = 'todo' | 'in_progress' | 'review' | 'done';

const displayStatusMap: Record<TaskStatus, DisplayStatus> = {
  todo: 'todo',
  in_progress: 'in_progress',
  blocked: 'review', // Map blocked to review for display
  completed: 'done',
  cancelled: 'done', // Map cancelled to done
};

const apiStatusMap: Record<DisplayStatus, TaskStatus> = {
  todo: 'todo',
  in_progress: 'in_progress',
  review: 'blocked', // Use blocked as the API status for review
  done: 'completed',
};

// Status configuration per requirements
const statusConfig: Record<DisplayStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  todo: { 
    label: 'To Do', 
    color: 'text-gray-600 dark:text-gray-400', 
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: <Circle className="h-4 w-4" /> 
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'text-sky-600 dark:text-sky-400', 
    bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    icon: <Play className="h-4 w-4" /> 
  },
  review: { 
    label: 'Review', 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <Eye className="h-4 w-4" /> 
  },
  done: { 
    label: 'Done', 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <CheckCircle2 className="h-4 w-4" /> 
  },
};

// Priority config
const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  high: { label: 'High', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  normal: { label: 'Normal', color: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30' },
  low: { label: 'Low', color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' },
};

// Task note interface
interface TaskNote {
  id: string;
  content: string;
  author: string;
  created_at: string;
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Dialog states
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newNote, setNewNote] = useState('');

  // Form state for new/edit task
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'normal' as TaskPriority,
    assignee_id: '',
    due_date: '',
    notes: '',
  });

  // Fetch tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['agency-tasks', showCompleted],
    queryFn: () => taskApi.getTasks({ include_completed: showCompleted }),
  });

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['agency-team-members'],
    queryFn: () => agencyApi.getTeamMembers(),
  });

  const tasks = tasksData?.tasks || [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tasks'] });
      setShowNewTaskDialog(false);
      resetForm();
      toast.success('Task created');
    },
    onError: () => toast.error('Failed to create task'),
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => taskApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tasks'] });
      setShowEditTaskDialog(false);
      setSelectedTask(null);
      toast.success('Task updated');
    },
    onError: () => toast.error('Failed to update task'),
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: taskApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tasks'] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: taskApi.completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tasks'] });
      toast.success('Task completed');
    },
    onError: () => toast.error('Failed to complete task'),
  });

  // Reset form
  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'normal',
      assignee_id: '',
      due_date: '',
      notes: '',
    });
  };

  // Open edit dialog
  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignee_id: task.assignee_id || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      notes: task.notes || '',
    });
    setShowEditTaskDialog(true);
  };

  // Open notes dialog
  const openNotesDialog = (task: Task) => {
    setSelectedTask(task);
    setNewNote('');
    setShowNotesDialog(true);
  };

  // Handle create task
  const handleCreateTask = () => {
    if (!taskForm.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    createTaskMutation.mutate({
      title: taskForm.title,
      description: taskForm.description || undefined,
      priority: taskForm.priority,
      assignee_id: taskForm.assignee_id || undefined,
      due_date: taskForm.due_date || undefined,
    });
  };

  // Handle update task
  const handleUpdateTask = () => {
    if (!selectedTask || !taskForm.title.trim()) return;
    updateTaskMutation.mutate({
      id: selectedTask.id,
      data: {
        title: taskForm.title,
        description: taskForm.description || undefined,
        priority: taskForm.priority,
        assignee_id: taskForm.assignee_id || undefined,
        due_date: taskForm.due_date || undefined,
        notes: taskForm.notes || undefined,
      },
    });
  };

  // Handle add note
  const handleAddNote = () => {
    if (!selectedTask || !newNote.trim()) return;
    const existingNotes = selectedTask.notes || '';
    const timestamp = new Date().toLocaleString();
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n\n[${timestamp}]\n${newNote}`
      : `[${timestamp}]\n${newNote}`;
    
    updateTaskMutation.mutate({
      id: selectedTask.id,
      data: { notes: updatedNotes },
    });
    setNewNote('');
    toast.success('Note added');
  };

  // Move task to new status
  const moveTask = (taskId: string, newDisplayStatus: DisplayStatus) => {
    const apiStatus = apiStatusMap[newDisplayStatus];
    if (newDisplayStatus === 'done') {
      completeTaskMutation.mutate(taskId);
    } else {
      updateTaskMutation.mutate({ id: taskId, data: { status: apiStatus } });
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [tasks, searchQuery]);

  // Group tasks by display status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<DisplayStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    
    filteredTasks.forEach(task => {
      const displayStatus = displayStatusMap[task.status];
      grouped[displayStatus].push(task);
    });
    
    return grouped;
  }, [filteredTasks]);

  // Get team member name
  const getTeamMemberName = (assigneeId: string | undefined) => {
    if (!assigneeId) return null;
    const member = teamMembers.find(m => m.user_id === assigneeId);
    return member?.user_full_name || member?.user_email || 'Unknown';
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  // Check if overdue
  const isOverdue = (dateString: string | undefined, status: TaskStatus) => {
    if (!dateString || status === 'completed' || status === 'cancelled') return false;
    return new Date(dateString) < new Date();
  };

  // Loading state
  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-500 dark:text-gray-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  // Task Card Component
  const TaskCard = ({ task }: { task: Task }) => {
    const displayStatus = displayStatusMap[task.status];
    const assigneeName = getTeamMemberName(task.assignee_id);
    
    return (
      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow",
        displayStatus === 'done' && "opacity-70"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className={cn(
            "font-medium text-gray-900 dark:text-gray-100 text-sm",
            displayStatus === 'done' && "line-through"
          )}>
            {task.title}
          </h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(task)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openNotesDialog(task)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Notes {task.notes && '•'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {displayStatus !== 'done' && (
                <DropdownMenuItem onClick={() => moveTask(task.id, 'done')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Done
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => { if (confirm('Delete this task?')) deleteTaskMutation.mutate(task.id); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority */}
          <Badge variant="secondary" className={cn("text-xs", priorityConfig[task.priority].color)}>
            <Flag className="h-3 w-3 mr-1" />
            {priorityConfig[task.priority].label}
          </Badge>

          {/* Due date */}
          {task.due_date && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                isOverdue(task.due_date, task.status) && "border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20"
              )}
            >
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(task.due_date)}
              {isOverdue(task.due_date, task.status) && <AlertTriangle className="h-3 w-3 ml-1" />}
            </Badge>
          )}

          {/* Notes indicator */}
          {task.notes && (
            <Badge variant="outline" className="text-xs">
              <MessageSquare className="h-3 w-3" />
            </Badge>
          )}
        </div>

        {/* Assignee */}
        {assigneeName && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700">
                {assigneeName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-500 dark:text-gray-400">{assigneeName}</span>
          </div>
        )}
      </div>
    );
  };

  // Board Column Component
  const BoardColumn = ({ status, tasks: columnTasks }: { status: DisplayStatus; tasks: Task[] }) => {
    const config = statusConfig[status];
    
    return (
      <div className="flex-1 min-w-[280px]">
        <div className={cn("rounded-t-lg px-3 py-2 flex items-center justify-between", config.bgColor)}>
          <div className="flex items-center gap-2">
            <span className={config.color}>{config.icon}</span>
            <h3 className={cn("font-semibold text-sm", config.color)}>{config.label}</h3>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {columnTasks.length}
            </Badge>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-b-lg p-2 min-h-[400px] space-y-2">
          {columnTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {columnTasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              No tasks
            </div>
          )}
        </div>
      </div>
    );
  };

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
        <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); setShowNewTaskDialog(true); }}>
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Checkbox
              checked={showCompleted}
              onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
            />
            Show completed
          </label>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <Button
            variant={viewMode === 'board' ? 'default' : 'ghost'}
            size="sm"
            className={cn("h-8 px-3", viewMode === 'board' && "bg-white dark:bg-gray-700 shadow-sm")}
            onClick={() => setViewMode('board')}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Board
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className={cn("h-8 px-3", viewMode === 'list' && "bg-white dark:bg-gray-700 shadow-sm")}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['todo', 'in_progress', 'review', 'done'] as DisplayStatus[]).map(status => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", statusConfig[status].bgColor)}>
                  <span className={statusConfig[status].color}>{statusConfig[status].icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tasksByStatus[status].length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{statusConfig[status].label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {(['todo', 'in_progress', 'review', 'done'] as DisplayStatus[]).map(status => (
            <BoardColumn key={status} status={status} tasks={tasksByStatus[status]} />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              All Tasks ({filteredTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <ListTodo className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tasks found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery ? 'Try a different search' : 'Create your first task to get started'}
                </p>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowNewTaskDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map(task => {
                  const displayStatus = displayStatusMap[task.status];
                  const assigneeName = getTeamMemberName(task.assignee_id);
                  
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                        displayStatus === 'done' && "opacity-60"
                      )}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={displayStatus === 'done'}
                        onCheckedChange={(checked) => {
                          if (checked) moveTask(task.id, 'done');
                          else moveTask(task.id, 'todo');
                        }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={cn(
                            "font-medium text-gray-900 dark:text-gray-100",
                            displayStatus === 'done' && "line-through"
                          )}>
                            {task.title}
                          </h3>
                          {task.notes && <MessageSquare className="h-4 w-4 text-gray-400" />}
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mb-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                          {assigneeName && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <User className="h-3.5 w-3.5" />
                              <span>{assigneeName}</span>
                            </div>
                          )}
                          {task.due_date && (
                            <div className={cn(
                              "flex items-center gap-1",
                              isOverdue(task.due_date, task.status) ? "text-red-600" : "text-gray-500"
                            )}>
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(task.due_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status & Priority */}
                      <div className="flex items-center gap-2">
                        <Badge className={priorityConfig[task.priority].color}>
                          {priorityConfig[task.priority].label}
                        </Badge>
                        <Select
                          value={displayStatus}
                          onValueChange={(value) => moveTask(task.id, value as DisplayStatus)}
                        >
                          <SelectTrigger className={cn("w-[120px] h-8", statusConfig[displayStatus].bgColor, statusConfig[displayStatus].color)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(['todo', 'in_progress', 'review', 'done'] as DisplayStatus[]).map(s => (
                              <SelectItem key={s} value={s}>
                                <span className="flex items-center gap-2">
                                  {statusConfig[s].icon}
                                  {statusConfig[s].label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(task)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openNotesDialog(task)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Notes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => { if (confirm('Delete this task?')) deleteTaskMutation.mutate(task.id); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task to track</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                placeholder="e.g., Send contract to Brand X"
                value={taskForm.title}
                onChange={(e) => setTaskForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Add details..."
                value={taskForm.description}
                onChange={(e) => setTaskForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-assignee">Assigned To</Label>
                <Select
                  value={taskForm.assignee_id}
                  onValueChange={(value) => setTaskForm(f => ({ ...f, assignee_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMembers.filter(m => m.status === 'active').map(member => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.user_full_name || member.user_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Due Date</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={taskForm.priority}
                onValueChange={(value) => setTaskForm(f => ({ ...f, priority: value as TaskPriority }))}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditTaskDialog} onOpenChange={setShowEditTaskDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-title">Title *</Label>
              <Input
                id="edit-task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select
                  value={taskForm.assignee_id}
                  onValueChange={(value) => setTaskForm(f => ({ ...f, assignee_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMembers.filter(m => m.status === 'active').map(member => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.user_full_name || member.user_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={taskForm.priority}
                onValueChange={(value) => setTaskForm(f => ({ ...f, priority: value as TaskPriority }))}
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
              <Label>Notes</Label>
              <Textarea
                value={taskForm.notes}
                onChange={(e) => setTaskForm(f => ({ ...f, notes: e.target.value }))}
                rows={4}
                placeholder="Add notes about this task..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTaskDialog(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleUpdateTask}
              disabled={updateTaskMutation.isPending}
            >
              {updateTaskMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Task Notes</DialogTitle>
            <DialogDescription>{selectedTask?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Existing notes */}
            <div className="space-y-2">
              <Label>Notes History</Label>
              {selectedTask?.notes ? (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                    {selectedTask.notes}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No notes yet</p>
              )}
            </div>

            {/* Add new note */}
            <div className="space-y-2">
              <Label>Add Note</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type your note..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>Close</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleAddNote}
              disabled={!newNote.trim() || updateTaskMutation.isPending}
            >
              {updateTaskMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
