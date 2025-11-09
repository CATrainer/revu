'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Calendar, CheckCircle2 } from 'lucide-react';
import { ProjectChat } from '@/components/monetization/ProjectChat';
import { ProgressDashboard } from '@/components/monetization/ProgressDashboard';
import { TaskList } from '@/components/monetization/TaskList';
import { DecisionCards } from '@/components/monetization/DecisionCards';
import { ProjectWorkspaceSkeleton } from '@/components/monetization/Skeletons';
import {
  getActiveProject,
  getProjectMessages,
  sendMessage,
  parseSSEStream,
  toggleTask,
  ActiveProject,
  ChatMessage,
  ProgressUpdate
} from '@/lib/monetization-api';
import { ErrorHandler } from '@/lib/error-handler';

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<ActiveProject | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load project data
  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [projectData, messagesData] = await Promise.all([
        getActiveProject(),
        getProjectMessages(projectId)
      ]);

      if (!projectData || projectData.id !== projectId) {
        setError('Project not found');
        return;
      }

      setProject(projectData);
      setMessages(messagesData.messages);
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!project) return;

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      setIsStreaming(true);
      setStreamingContent('');

      const stream = await sendMessage(project.id, message);
      let fullResponse = '';
      let detectedActions: any[] = [];
      let progressUpdate: ProgressUpdate | null = null;

      for await (const chunk of parseSSEStream(stream)) {
        if (chunk.type === 'content' && chunk.delta) {
          fullResponse += chunk.delta;
          setStreamingContent(fullResponse);
        } else if (chunk.type === 'done') {
          if (chunk.actions) {
            detectedActions = chunk.actions;
          }
          if (chunk.progress) {
            progressUpdate = chunk.progress;
          }
        } else if (chunk.type === 'error') {
          throw new Error(chunk.message || 'Streaming error');
        }
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fullResponse,
        created_at: new Date().toISOString(),
        detected_actions: detectedActions
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update progress if provided
      if (progressUpdate && project) {
        setProject({
          ...project,
          ...progressUpdate
        });
      }

      // Reload project to get updated state
      setTimeout(() => loadProject(), 1000);

    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean, notes?: string) => {
    if (!project) return;

    try {
      const result = await toggleTask(project.id, taskId, completed, notes);
      
      // Update project progress
      setProject({
        ...project,
        ...result.progress
      });

      // Reload to get updated tasks
      await loadProject();
    } catch (err) {
      console.error('Failed to toggle task:', err);
      throw err;
    }
  };

  if (isLoading) {
    return <ProjectWorkspaceSkeleton />;
  }

  if (error || !project) {
    return (
      <div className="container mx-auto p-6">
        <div className="dashboard-card p-8 text-center">
          <h2 className="text-xl font-semibold text-primary-dark mb-2">
            {error || 'Project not found'}
          </h2>
          <Button onClick={() => router.push('/monetization')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Monetization
          </Button>
        </div>
      </div>
    );
  }

  const decisionsCount = project.decisions.length;
  const tasksCompleted = project.completed_tasks.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/monetization')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-dark">
              {project.opportunity_title}
            </h1>
            <p className="text-secondary-dark mt-1">
              Started {new Date(project.started_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={
              project.status === 'active'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                : project.status === 'completed'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300'
            }
          >
            {project.status}
          </Badge>
          {project.target_launch_date && (
            <div className="flex items-center gap-2 text-sm text-secondary-dark">
              <Calendar className="h-4 w-4" />
              <span>Launch: {new Date(project.target_launch_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <ProgressDashboard
        overallProgress={project.overall_progress}
        planningProgress={project.planning_progress}
        executionProgress={project.execution_progress}
        timelineProgress={project.timeline_progress}
        decisionsCount={decisionsCount}
        tasksCompleted={tasksCompleted}
        targetLaunchDate={project.target_launch_date}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="chat">
            AI Partner Chat
            {messages.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {messages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            <Badge variant="secondary" className="ml-2">
              {tasksCompleted}/22
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="decisions">
            Decisions
            <Badge variant="secondary" className="ml-2">
              {decisionsCount}/5
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-0">
          <div className="dashboard-card overflow-hidden" style={{ height: '600px' }}>
            <ProjectChat
              messages={messages}
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
            />
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-0">
          <TaskList
            phases={project.customized_plan}
            completedTasks={project.completed_tasks}
            onToggleTask={handleToggleTask}
            currentPhaseIndex={project.current_phase_index}
          />
        </TabsContent>

        <TabsContent value="decisions" className="space-y-0">
          <DecisionCards decisions={project.decisions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
