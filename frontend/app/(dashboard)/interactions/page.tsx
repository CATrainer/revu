"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Filter, Inbox, Star, Archive, Zap } from 'lucide-react';
import Link from 'next/link';

import ViewSidebar from './components/ViewSidebar';
import InteractionList from './components/InteractionList';
import ViewBuilder from './components/ViewBuilder';
import { ViewTabs, type TabType } from './components/ViewTabs';
import { ViewControls } from './components/ViewControls';
import { InteractionDetailPanel } from './components/InteractionDetailPanel';
import { WorkflowPanel } from './components/WorkflowPanel';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { api } from '@/lib/api';

type SortOption = 'newest' | 'oldest' | 'priority' | 'engagement';
type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter';

interface View {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: string;
  filters: any;
  display: any;
  is_pinned: boolean;
  is_system?: boolean;
  is_shared?: boolean;
  interaction_count?: number;
  unread_count?: number;
}

export default function InteractionsPage() {
  const [views, setViews] = useState<View[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showViewBuilder, setShowViewBuilder] = useState(false);
  const [editingView, setEditingView] = useState<View | null>(null);
  
  // V2: Filter state
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Tab state for custom views (not used for system views)
  const [activeTab, setActiveTab] = useState<TabType>('unanswered');

  // Load views on mount
  useEffect(() => {
    loadViews();
  }, []);

  const loadViews = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/views?include_shared=true');
      const loadedViews = response.data.views || [];
      setViews(loadedViews);
      
      // Set first view as active if none selected
      if (!activeViewId && loadedViews.length > 0) {
        setActiveViewId(loadedViews[0].id);
      }
    } catch (error) {
      console.error('Failed to load views:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeView = views.find(v => v.id === activeViewId);

  const handleCreateView = () => {
    setEditingView(null);
    setShowViewBuilder(true);
  };

  const handleEditView = (view: View) => {
    setEditingView(view);
    setShowViewBuilder(true);
  };

  const handleViewSaved = async (savedView: any) => {
    await loadViews();
    setShowViewBuilder(false);
    setEditingView(null);
    // Set newly created view as active
    if (!editingView && savedView?.id) {
      setActiveViewId(savedView.id);
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (!confirm('Are you sure you want to delete this view?')) return;
    
    try {
      await api.delete(`/views/${viewId}`);
      setViews(views.filter(v => v.id !== viewId));
      
      // If deleted view was active, switch to first available
      if (activeViewId === viewId && views.length > 1) {
        const remainingViews = views.filter(v => v.id !== viewId);
        setActiveViewId(remainingViews[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to delete view:', error);
      alert('Failed to delete view');
    }
  };

  // V2: Handlers for new features
  const handleResetFilters = () => {
    setSelectedPlatforms([]);
    setSortBy('newest');
  };

  const handleInteractionClick = (interactionId: string) => {
    setSelectedInteractionId(interactionId);
    setShowWorkflowPanel(false);
    setShowAnalytics(false);
  };

  const handleCloseDetailPanel = () => {
    setSelectedInteractionId(null);
  };

  const handleInteractionUpdate = () => {
    // Reload the list when an interaction is updated
    loadViews();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 md:-mx-8 -my-6">
      {/* Sidebar */}
      <ViewSidebar
        views={views}
        activeViewId={activeViewId}
        onSelectView={setActiveViewId}
        onCreateView={handleCreateView}
        onEditView={handleEditView}
        onDeleteView={handleDeleteView}
        isLoading={isLoading}
        onShowWorkflows={() => {
          setShowAnalytics(false);
          setSelectedInteractionId(null);
          setShowWorkflowPanel(true);
        }}
        onShowAnalytics={() => {
          setShowWorkflowPanel(false);
          setSelectedInteractionId(null);
          setShowAnalytics(true);
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Glassmorphic */}
        <div className="glass-panel border-b border-border backdrop-blur-md px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {activeView?.icon && <span className="text-4xl">{activeView.icon}</span>}
                <h1 className="text-3xl font-bold text-holo-purple">
                  {activeView?.name || 'All Interactions'}
                </h1>
              </div>
              {activeView?.description && (
                <p className="text-sm text-muted-foreground font-medium">{activeView.description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Only show View Settings for non-system views */}
              {activeView && !activeView.is_system && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditView(activeView)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  View Settings
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={handleCreateView}
              >
                <Plus className="h-4 w-4 mr-2" />
                New View
              </Button>
            </div>
          </div>
        </div>

        {/* View Tabs - Only show for custom views (not system views) */}
        {activeViewId && activeView && !activeView.is_system && (
          <ViewTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}

        {/* V2: View Controls (Sort & Filter) */}
        {activeViewId && (
          <ViewControls
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectedPlatforms={selectedPlatforms}
            onPlatformsChange={setSelectedPlatforms}
            onReset={handleResetFilters}
          />
        )}

        {/* Interaction List */}
        <div className="flex-1 overflow-hidden">
          {activeViewId ? (
            <InteractionList
              viewId={activeViewId}
              filters={activeView?.filters}
              sortBy={sortBy}
              tab={activeView?.is_system ? undefined : activeTab}
              platforms={selectedPlatforms}
              onInteractionClick={handleInteractionClick}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
              <div className="glass-panel rounded-3xl p-12 border border-holo-purple/30 shadow-glow-purple backdrop-blur-md max-w-md">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-holo-purple/20 to-holo-teal/20 inline-block mb-6">
                  <Inbox className="h-16 w-16 text-holo-purple" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-holo-purple">No View Selected</h3>
                <p className="text-muted-foreground mb-6 text-base">
                  Create a view to organize your interactions and streamline your workflow
                </p>
                <Button onClick={handleCreateView} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First View
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Builder Modal */}
      {showViewBuilder && (
        <ViewBuilder
          view={editingView}
          onClose={() => {
            setShowViewBuilder(false);
            setEditingView(null);
          }}
          onSave={handleViewSaved}
        />
      )}

      {/* V2: Interaction Detail Panel */}
      {selectedInteractionId && (
        <InteractionDetailPanel
          interactionId={selectedInteractionId}
          onClose={handleCloseDetailPanel}
          onUpdate={handleInteractionUpdate}
        />
      )}

      {/* V2: Workflow Panel */}
      {showWorkflowPanel && (
        <WorkflowPanel
          viewId={activeViewId}
          viewName={activeView?.name}
          onClose={() => setShowWorkflowPanel(false)}
          onUpdate={loadViews}
        />
      )}

      {/* Analytics Panel */}
      {showAnalytics && (
        <AnalyticsPanel
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
}
