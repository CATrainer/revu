'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, ArrowRight, Plus, TrendingUp } from 'lucide-react';
import { getProfile, getActiveProject, createProject, CreatorProfile, ActiveProject } from '@/lib/monetization-api';

export default function MonetizationPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [project, setProject] = useState<ActiveProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [profileData, projectData] = await Promise.all([
        getProfile(),
        getActiveProject()
      ]);
      setProfile(profileData);
      setProject(projectData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      setIsCreatingProject(true);
      const result = await createProject();
      router.push(`/monetization/project/${result.project_id}`);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      alert(error.message || 'Failed to create project');
      setIsCreatingProject(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // No profile - redirect to setup
  if (!profile) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="dashboard-card p-12 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950 dark:to-blue-950 mb-4">
            <Sparkles className="h-10 w-10 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-dark mb-3">
              Welcome to Monetization Engine
            </h1>
            <p className="text-lg text-secondary-dark max-w-2xl mx-auto">
              Launch your Premium Community in 30 minutes with AI-powered guidance. 
              Let's start by setting up your creator profile.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => router.push('/monetization/setup')}
            className="px-8"
          >
            Get Started
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Has profile but no project
  if (!project) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-dark">
            Monetization Engine
          </h1>
          <p className="text-secondary-dark mt-2">
            Launch your Premium Community with AI-powered guidance
          </p>
        </div>

        {/* Profile Summary */}
        <div className="dashboard-card p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-dark mb-2">Your Creator Profile</h3>
              <div className="flex items-center gap-4 text-sm text-secondary-dark">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="capitalize">{profile.primary_platform}</span>
                </div>
                <div>
                  {profile.follower_count.toLocaleString()} followers
                </div>
                <div>
                  {profile.engagement_rate}% engagement
                </div>
                <div className="capitalize">
                  {profile.niche}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/monetization/setup')}
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Premium Community Opportunity */}
        <div className="dashboard-card p-8 space-y-6">
          <div className="flex items-start gap-6">
            <div className="text-6xl">💎</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-primary-dark mb-2">
                Premium Community Launch
              </h2>
              <p className="text-secondary-dark mb-4">
                Turn your engaged audience into a thriving paid community. Launch a Discord or Circle 
                membership in 3-5 weeks with personalized AI guidance.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    $1.6K - $8K
                  </div>
                  <div className="text-sm text-secondary-dark">Monthly Revenue Potential</div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    3-5 Weeks
                  </div>
                  <div className="text-sm text-secondary-dark">Time to Launch</div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    30 Minutes
                  </div>
                  <div className="text-sm text-secondary-dark">Planning Session</div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-primary-dark">What You'll Get:</h3>
                <ul className="space-y-2 text-sm text-secondary-dark">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>AI-guided planning session to make 5 key decisions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>Personalized 22-task implementation roadmap</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>Real-time progress tracking and milestone celebrations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>Data-backed recommendations based on your metrics</span>
                  </li>
                </ul>
              </div>

              <Button
                size="lg"
                onClick={handleCreateProject}
                disabled={isCreatingProject}
                className="px-8"
              >
                {isCreatingProject ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Start Your Project
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has active project - show summary and link
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary-dark">
          Monetization Engine
        </h1>
        <p className="text-secondary-dark mt-2">
          Your Premium Community launch is in progress
        </p>
      </div>

      {/* Active Project Card */}
      <div className="dashboard-card p-8 space-y-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="text-5xl">💎</div>
            <div>
              <h2 className="text-2xl font-bold text-primary-dark mb-2">
                {project.opportunity_title}
              </h2>
              <div className="flex items-center gap-3 text-sm text-secondary-dark">
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                >
                  {project.status}
                </Badge>
                <span>Started {new Date(project.started_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>{project.message_count} messages</span>
              </div>
            </div>
          </div>
          <Button onClick={() => router.push(`/monetization/project/${project.id}`)}>
            Open Project
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-secondary-dark">Overall Progress</span>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {project.overall_progress}%
              </span>
            </div>
            <Progress value={project.overall_progress} className="h-2" />
          </div>
          <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-secondary-dark">Decisions Made</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {project.decisions.length}/5
              </span>
            </div>
            <Progress value={(project.decisions.length / 5) * 100} className="h-2" />
          </div>
          <div className="p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-secondary-dark">Tasks Completed</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {project.completed_tasks.length}/22
              </span>
            </div>
            <Progress value={(project.completed_tasks.length / 22) * 100} className="h-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
