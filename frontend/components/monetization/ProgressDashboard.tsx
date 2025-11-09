'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle2, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressDashboardProps {
  overallProgress: number;
  planningProgress: number;
  executionProgress: number;
  timelineProgress?: number;
  decisionsCount: number;
  tasksCompleted: number;
  totalTasks?: number;
  targetLaunchDate?: string;
}

export function ProgressDashboard({
  overallProgress,
  planningProgress,
  executionProgress,
  timelineProgress,
  decisionsCount,
  tasksCompleted,
  totalTasks = 22,
  targetLaunchDate
}: ProgressDashboardProps) {
  const progressItems = [
    {
      label: 'Planning',
      value: planningProgress,
      icon: Target,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      description: `${decisionsCount}/5 key decisions made`
    },
    {
      label: 'Execution',
      value: executionProgress,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      description: `${tasksCompleted}/${totalTasks} tasks completed`
    },
  ];

  if (timelineProgress !== undefined && targetLaunchDate) {
    progressItems.push({
      label: 'Timeline',
      value: timelineProgress,
      icon: Clock,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      description: `Target: ${new Date(targetLaunchDate).toLocaleDateString()}`
    });
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="dashboard-card p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary-dark">Overall Progress</h3>
              <p className="text-sm text-secondary-dark">Your journey to launch</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">
              {overallProgress}%
            </div>
            <Badge 
              variant="secondary" 
              className={cn(
                "mt-1",
                overallProgress < 30 && "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                overallProgress >= 30 && overallProgress < 70 && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                overallProgress >= 70 && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              )}
            >
              {overallProgress < 30 && 'Getting Started'}
              {overallProgress >= 30 && overallProgress < 70 && 'In Progress'}
              {overallProgress >= 70 && 'Almost There!'}
            </Badge>
          </div>
        </div>
        <Progress value={overallProgress} className="h-3" />
      </div>

      {/* Detailed Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {progressItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "dashboard-card p-5 transition-all duration-300 hover:-translate-y-1",
                item.bgColor
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                  item.color
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-primary-dark">{item.label}</h4>
                  <p className="text-xs text-secondary-dark">{item.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-dark">Progress</span>
                  <span className="font-bold text-primary-dark tabular-nums">{item.value}%</span>
                </div>
                <Progress value={item.value} className="h-2" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Milestone Celebration */}
      {overallProgress >= 100 && (
        <div className="dashboard-card p-6 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-2 border-emerald-200 dark:border-emerald-800 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🎉</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                Congratulations! You're Ready to Launch!
              </h3>
              <p className="text-sm text-secondary-dark">
                You've completed all the planning and execution tasks. Time to launch your Premium Community!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
