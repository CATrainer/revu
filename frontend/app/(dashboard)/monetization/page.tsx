'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles, ArrowRight, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getProjects } from '@/lib/monetization-api';
import type { ProjectListItem } from '@/types/monetization';

export default function MonetizationPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const projectsData = await getProjects().catch(() => ({ projects: [], total: 0 }));
      setProjects(projectsData.projects);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-dark">
            Monetization Engine
          </h1>
          <p className="text-secondary-dark mt-2">
            {projects.length === 0
              ? 'Choose from 100+ proven templates with AI-powered recommendations'
              : `Managing ${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
          </p>
        </div>
        <Button onClick={() => router.push('/monetization/new')} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <EmptyState onCreateProject={() => router.push('/monetization/new')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => router.push(`/monetization/project/${project.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <div className="dashboard-card p-8 space-y-6">
      <div className="flex items-start gap-6">
        <div className="text-6xl">💎</div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-primary-dark mb-2">
            Ready to Monetize Your Audience?
          </h2>
          <p className="text-secondary-dark mb-4">
            Choose from 50+ proven monetization strategies with step-by-step action plans
            and Kanban-style task management.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                50+ Templates
              </div>
              <div className="text-sm text-secondary-dark">Across 5 Categories</div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                Kanban Board
              </div>
              <div className="text-sm text-secondary-dark">Visual Task Management</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                AI-Powered
              </div>
              <div className="text-sm text-secondary-dark">Personalized Recommendations</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-primary-dark">Categories Include:</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">📦 Digital Products</Badge>
              <Badge variant="secondary">🎯 Services</Badge>
              <Badge variant="secondary">📦 Physical Products</Badge>
              <Badge variant="secondary">🤝 Partnerships</Badge>
              <Badge variant="secondary">⚡ Platform Features</Badge>
            </div>
          </div>

          <Button size="lg" onClick={onCreateProject} className="px-8">
            <Sparkles className="h-5 w-5 mr-2" />
            Explore Templates
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: ProjectListItem;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const statusColors = {
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    abandoned: 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300',
  };

  return (
    <div
      className="dashboard-card p-6 space-y-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FolderOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary-dark mb-1">{project.title}</h3>
            <div className="flex items-center gap-2 text-sm text-secondary-dark">
              <Badge variant="secondary" className={statusColors[project.status]}>
                {project.status}
              </Badge>
              <span>•</span>
              <span>Started {new Date(project.started_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-secondary-dark">Progress</span>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {project.progress.percentage}%
            </span>
          </div>
          <Progress value={project.progress.percentage} className="h-1.5" />
        </div>
        <div className="flex items-center justify-between text-xs text-secondary-dark">
          <span>{project.progress.done} of {project.progress.total} tasks done</span>
          <span>{project.progress.in_progress} in progress</span>
        </div>
      </div>

      <div className="text-xs text-secondary-dark">
        Last updated {new Date(project.updated_at).toLocaleDateString()}
      </div>
    </div>
  );
}
