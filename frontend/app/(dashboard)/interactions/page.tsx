"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Filter, Inbox, Star, Archive } from 'lucide-react';
import Link from 'next/link';

import ViewSidebar from './components/ViewSidebar';
import InteractionList from './components/InteractionList';
import ViewBuilder from './components/ViewBuilder';
import { ViewTabs, type TabType } from './components/ViewTabs';
import { ViewControls } from './components/ViewControls';
import { InteractionDetailPanel } from './components/InteractionDetailPanel';
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
  is_system: boolean;
  interaction_count?: number;
  unread_count?: number;
}

export default function InteractionsPage() {
  const [views, setViews] = useState<View[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showViewBuilder, setShowViewBuilder] = useState(false);
  const [editingView, setEditingView] = useState<View | null>(null);
  
  // V2: Tab and filter state
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);
  const [tabCounts, setTabCounts] = useState<{
    all?: number;
    unanswered?: number;
    awaiting_approval?: number;
    answered?: number;
  }>({});

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

  const handleViewSaved = async (savedView: View) => {
    await loadViews();
    setShowViewBuilder(false);
    setEditingView(null);
    // Set newly created view as active
    if (!editingView) {
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
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-dark flex items-center gap-3">
                {activeView?.icon && <span className="text-3xl">{activeView.icon}</span>}
                {activeView?.name || 'All Interactions'}
              </h1>
              {activeView?.description && (
                <p className="text-sm text-secondary-dark mt-1">{activeView.description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowViewBuilder(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                View Settings
              </Button>
              
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

        {/* V2: View Tabs */}
        {activeViewId && (
          <ViewTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={tabCounts}
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
              tab={activeTab}
              platforms={selectedPlatforms}
              onInteractionClick={handleInteractionClick}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No View Selected</h3>
              <p className="text-secondary-dark mb-4">
                Create a view to organize your interactions
              </p>
              <Button onClick={handleCreateView}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First View
              </Button>
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
    </div>
  );
}
