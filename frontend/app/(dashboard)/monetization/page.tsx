'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, ArrowRight, Plus, TrendingUp } from 'lucide-react';
import { getProfile, getAllProjects, createProject, CreatorProfile, ActiveProject } from '@/lib/monetization-api';
import { ErrorHandler } from '@/lib/error-handler';

export default function MonetizationPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const result = await ErrorHandler.withErrorHandling(
      async () => {
        const [profileData, projectsData] = await Promise.all([
          getProfile(),
          getAllProjects()
        ]);
        setProfile(profileData);
        setProjects(projectsData.projects);
        return true;
      },
      'Loading monetization data'
    );
    setIsLoading(false);
  };

  const handleCreateProject = () => {
    // Navigate to opportunity selection page
    router.push('/monetization/choose-opportunity');
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
              Choose from 20 proven monetization templates or get AI-powered custom recommendations.
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

  // Has profile - show projects list
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
              ? 'Choose from 20 proven templates or get AI-powered custom recommendations'
              : `Managing ${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
          </p>
        </div>
        <Button
          onClick={handleCreateProject}
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </Button>
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

      {/* Projects List */}
      {projects.length === 0 ? (
        // No projects - show opportunity card
        <div className="dashboard-card p-8 space-y-6">
          <div className="flex items-start gap-6">
            <div className="text-6xl">💎</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-primary-dark mb-2">
                Ready to Monetize Your Audience?
              </h2>
              <p className="text-secondary-dark mb-4">
                Choose from 20 proven monetization strategies or get AI-powered custom recommendations
                tailored to your unique audience and content.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    20+ Templates
                  </div>
                  <div className="text-sm text-secondary-dark">Proven Monetization Models</div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    AI-Powered
                  </div>
                  <div className="text-sm text-secondary-dark">Custom Recommendations</div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    30 Minutes
                  </div>
                  <div className="text-sm text-secondary-dark">To Get Started</div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-primary-dark">What You'll Get:</h3>
                <ul className="space-y-2 text-sm text-secondary-dark">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>20 proven monetization templates across communities, courses, coaching, and more</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>AI-powered custom recommendations based on your audience and content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>Personalized implementation roadmap with real-time progress tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>Revenue estimates and time investment guidance for each opportunity</span>
                  </li>
                </ul>
              </div>

              <Button
                size="lg"
                onClick={handleCreateProject}
                className="px-8"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Explore Monetization Options
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Has projects - show grid
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="dashboard-card p-6 space-y-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/monetization/project/${project.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="text-4xl">💎</div>
                  <div>
                    <h3 className="text-xl font-bold text-primary-dark mb-1">
                      {project.opportunity_title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-secondary-dark">
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
                      <span>•</span>
                      <span>Started {new Date(project.started_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/monetization/project/${project.id}`);
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-secondary-dark">Overall Progress</span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      {project.overall_progress}%
                    </span>
                  </div>
                  <Progress value={project.overall_progress} className="h-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-secondary-dark">
                  <div>Planning: {project.planning_progress}%</div>
                  <div>Execution: {project.execution_progress}%</div>
                </div>
              </div>

              <div className="text-xs text-secondary-dark">
                Last updated {new Date(project.last_activity_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
