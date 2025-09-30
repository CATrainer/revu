'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AIContext {
  user_id: string;
  channel_name?: string;
  niche?: string;
  content_type?: string;
  avg_video_length?: number;
  upload_frequency?: string;
  primary_platform?: string;
  subscriber_count?: number;
  avg_views?: number;
  top_performing_topics?: string[];
  goals?: string;
  target_audience?: string;
  brand_voice?: string;
  custom_notes?: string;
  last_auto_update?: string;
  last_user_edit?: string;
}

export function ContextEditor() {
  const [context, setContext] = useState<AIContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedContext, setEditedContext] = useState<Partial<AIContext>>({});

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ai/context');
      setContext(response.data);
      setEditedContext(response.data);
    } catch (err) {
      console.error('Failed to load context:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshContext = async () => {
    try {
      setRefreshing(true);
      const response = await api.post('/ai/context/refresh');
      setContext(response.data);
      setEditedContext(response.data);
    } catch (err) {
      console.error('Failed to refresh context:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const saveContext = async () => {
    try {
      setSaving(true);
      const response = await api.put('/ai/context', {
        niche: editedContext.niche,
        content_type: editedContext.content_type,
        upload_frequency: editedContext.upload_frequency,
        goals: editedContext.goals,
        target_audience: editedContext.target_audience,
        brand_voice: editedContext.brand_voice,
        custom_notes: editedContext.custom_notes,
      });
      setContext(response.data);
      setEditing(false);
    } catch (err) {
      console.error('Failed to save context:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-500" />
            AI Context Manager
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Automatically managed context that personalizes your AI assistant
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={refreshContext}
            disabled={refreshing}
            variant="outline"
            className="gap-2"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh from YouTube
          </Button>
          {editing ? (
            <Button onClick={saveContext} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          ) : (
            <Button onClick={() => setEditing(true)} variant="outline" className="gap-2">
              <Edit3 className="h-4 w-4" />
              Edit Context
            </Button>
          )}
        </div>
      </div>

      {/* Auto-detected Context */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Auto-Detected Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem
            icon={<User className="h-4 w-4" />}
            label="Channel Name"
            value={context?.channel_name}
          />
          <InfoItem
            icon={<Globe className="h-4 w-4" />}
            label="Platform"
            value={context?.primary_platform}
          />
          <InfoItem
            icon={<User className="h-4 w-4" />}
            label="Subscribers"
            value={context?.subscriber_count ? context.subscriber_count.toLocaleString() : undefined}
          />
          <InfoItem
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg Views"
            value={context?.avg_views ? context.avg_views.toLocaleString() : undefined}
          />
          <InfoItem
            icon={<Video className="h-4 w-4" />}
            label="Content Type"
            value={context?.content_type}
            editable={editing}
            onEdit={(value) => setEditedContext({ ...editedContext, content_type: value })}
            editValue={editedContext.content_type}
          />
          <InfoItem
            icon={<Calendar className="h-4 w-4" />}
            label="Upload Schedule"
            value={context?.upload_frequency}
            editable={editing}
            onEdit={(value) => setEditedContext({ ...editedContext, upload_frequency: value })}
            editValue={editedContext.upload_frequency}
          />
        </div>

        {context?.top_performing_topics && context.top_performing_topics.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Top Topics:
            </p>
            <div className="flex flex-wrap gap-2">
              {context.top_performing_topics.map((topic, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* User-Provided Context */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-500" />
          Your Custom Context
        </h3>
        <div className="space-y-4">
          <TextAreaField
            label="Niche"
            placeholder="e.g., Tech Reviews, Gaming, Lifestyle Vlogging"
            value={editing ? editedContext.niche : context?.niche}
            editing={editing}
            onChange={(value) => setEditedContext({ ...editedContext, niche: value })}
          />
          <TextAreaField
            label="Goals"
            placeholder="What are your content goals? (e.g., Reach 100K subscribers, Increase engagement)"
            value={editing ? editedContext.goals : context?.goals}
            editing={editing}
            onChange={(value) => setEditedContext({ ...editedContext, goals: value })}
          />
          <TextAreaField
            label="Target Audience"
            placeholder="Describe your ideal audience (age, interests, location)"
            value={editing ? editedContext.target_audience : context?.target_audience}
            editing={editing}
            onChange={(value) => setEditedContext({ ...editedContext, target_audience: value })}
          />
          <TextAreaField
            label="Brand Voice"
            placeholder="e.g., Casual & Humorous, Professional & Educational, Energetic & Motivational"
            value={editing ? editedContext.brand_voice : context?.brand_voice}
            editing={editing}
            onChange={(value) => setEditedContext({ ...editedContext, brand_voice: value })}
          />
          <TextAreaField
            label="Additional Notes"
            placeholder="Any other context that would help the AI assist you better"
            value={editing ? editedContext.custom_notes : context?.custom_notes}
            editing={editing}
            onChange={(value) => setEditedContext({ ...editedContext, custom_notes: value })}
          />
        </div>
      </Card>

      {/* Last Updated Info */}
      {context?.last_auto_update && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Last auto-updated: {new Date(context.last_auto_update).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  editable,
  onEdit,
  editValue,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  editable?: boolean;
  onEdit?: (value: string) => void;
  editValue?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        {editable && onEdit ? (
          <input
            type="text"
            value={editValue || ''}
            onChange={(e) => onEdit(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
          />
        ) : (
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {value || <span className="text-slate-400">Not set</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  placeholder,
  value,
  editing,
  onChange,
}: {
  label: string;
  placeholder: string;
  value?: string;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      {editing ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      ) : (
        <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-4 py-3 rounded-lg min-h-[84px]">
          {value || <span className="text-slate-400">{placeholder}</span>}
        </p>
      )}
    </div>
  );
}
