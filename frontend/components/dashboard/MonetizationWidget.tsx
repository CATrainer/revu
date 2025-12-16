'use client';

import Link from 'next/link';
import { DollarSign, ArrowRight, Sparkles, Target } from 'lucide-react';

interface MonetizationWidgetProps {
  hasProject: boolean;
  projectId: string | null;
  projectName: string | null;
  tasksCompleted: number;
  tasksTotal: number;
  progressPercent: number;
  estimatedRevenue: number | null;
}

export function MonetizationWidget({
  hasProject,
  projectId,
  projectName,
  tasksCompleted,
  tasksTotal,
  progressPercent,
  estimatedRevenue,
}: MonetizationWidgetProps) {
  if (!hasProject) {
    return (
      <div className="glass-panel rounded-2xl border border-holo-pink/20 p-6 shadow-glass backdrop-blur-md h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Monetization</h3>
          <div className="p-2 rounded-xl bg-gradient-to-br from-holo-pink/20 to-holo-pink-dark/20 border border-holo-pink/30">
            <DollarSign className="h-5 w-5 text-holo-pink" />
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="p-4 rounded-full bg-holo-pink/10 border border-holo-pink/30 mb-4">
            <Sparkles className="h-8 w-8 text-holo-pink" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Start a monetization project to unlock new revenue streams
          </p>
          <Link
            href="/monetization"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-holo-pink to-holo-purple text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Sparkles className="h-4 w-4" />
            Explore Opportunities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-holo-pink/20 p-6 shadow-glass backdrop-blur-md h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Monetization</h3>
        <div className="p-2 rounded-xl bg-gradient-to-br from-holo-pink/20 to-holo-pink-dark/20 border border-holo-pink/30">
          <DollarSign className="h-5 w-5 text-holo-pink" />
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {/* Active Project */}
        <div className="p-4 rounded-xl bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-holo-pink" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Active Project</span>
          </div>
          <p className="font-semibold text-foreground line-clamp-1">{projectName}</p>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{tasksCompleted}/{tasksTotal} tasks</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-holo-pink to-holo-purple rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Estimated Revenue */}
        {estimatedRevenue !== null && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-sm text-muted-foreground">Est. Revenue</span>
            <span className="text-lg font-bold text-emerald-400">
              ${estimatedRevenue.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <Link
        href={`/monetization/project/${projectId}`}
        className="mt-4 flex items-center justify-center gap-2 text-sm text-holo-pink hover:text-holo-pink/80 font-medium transition-colors group"
      >
        Continue Project
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}
