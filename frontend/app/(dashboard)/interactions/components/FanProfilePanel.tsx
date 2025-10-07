'use client';

import { useState, useEffect } from 'react';
import { X, Star, TrendingUp, Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface FanProfilePanelProps {
  fanId: string;
  onClose: () => void;
}

export function FanProfilePanel({ fanId, onClose }: FanProfilePanelProps) {
  const [fan, setFan] = useState<any>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFanProfile();
  }, [fanId]);

  const loadFanProfile = async () => {
    try {
      setLoading(true);
      const [fanRes, interactionsRes] = await Promise.all([
        api.get(`/fans/${fanId}`),
        api.get(`/fans/${fanId}/interactions`),
      ]);
      
      setFan(fanRes.data);
      setInteractions(interactionsRes.data.interactions || []);
    } catch (error) {
      console.error('Failed to load fan profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-card border-l border-border shadow-lg flex items-center justify-center z-50">
        <div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!fan) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-card border-l border-border shadow-lg flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          {fan.avatar_url ? (
            <img src={fan.avatar_url} alt={fan.username} className="h-12 w-12 rounded-full" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-brand-primary/10 flex items-center justify-center">
              <span className="text-xl font-semibold text-brand-primary">
                {fan.username?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-primary-dark flex items-center gap-2">
              {fan.username}
              {fan.is_superfan && (
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              )}
            </h2>
            <p className="text-sm text-secondary-dark">{fan.platform}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border bg-muted/30">
        <div className="text-center">
          <MessageCircle className="h-5 w-5 mx-auto text-blue-600 mb-1" />
          <p className="text-2xl font-bold text-primary-dark">{fan.interaction_count || 0}</p>
          <p className="text-xs text-secondary-dark">Interactions</p>
        </div>
        <div className="text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-green-600 mb-1" />
          <p className="text-2xl font-bold text-primary-dark">{fan.engagement_score || 0}</p>
          <p className="text-xs text-secondary-dark">Engagement</p>
        </div>
        <div className="text-center">
          <Heart className="h-5 w-5 mx-auto text-red-600 mb-1" />
          <p className="text-2xl font-bold text-primary-dark">{fan.lifetime_value_score || 0}</p>
          <p className="text-xs text-secondary-dark">LTV Score</p>
        </div>
      </div>

      {/* Superfan Status */}
      {fan.is_superfan && (
        <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">Superfan</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Since {new Date(fan.superfan_since).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactions List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <h3 className="font-medium text-primary-dark mb-3">Recent Interactions</h3>
        <div className="space-y-3">
          {interactions.map((interaction) => (
            <div key={interaction.id} className="p-3 border border-border rounded-lg">
              <p className="text-sm text-primary-dark mb-2">{interaction.content}</p>
              <div className="flex items-center justify-between text-xs text-secondary-dark">
                <span className="capitalize">{interaction.platform}</span>
                <span>{new Date(interaction.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
