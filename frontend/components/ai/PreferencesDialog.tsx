'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';

interface UserPreferences {
  custom_instructions: string | null;
  response_style: string;
  expertise_level: string;
  tone: string;
  preferences: Record<string, any>;
}

export function PreferencesDialog() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    custom_instructions: null,
    response_style: 'balanced',
    expertise_level: 'intermediate',
    tone: 'friendly',
    preferences: {},
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchPreferences();
    }
  }, [open]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/preferences');
      setPreferences(response.data);
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await api.put('/users/preferences', preferences);
      setSuccessMessage('Preferences saved successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        setOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all preferences to defaults?')) return;
    
    try {
      setSaving(true);
      await api.delete('/users/preferences');
      await fetchPreferences();
      setSuccessMessage('Preferences reset to defaults');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Failed to reset preferences:', err);
      setError('Failed to reset preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const response = await api.post('/users/preferences/analyze');
      const { suggestions } = response.data;
      
      setPreferences({
        ...preferences,
        response_style: suggestions.response_style,
        expertise_level: suggestions.expertise_level,
        tone: suggestions.tone,
      });
      
      setSuccessMessage('Preferences optimized based on your usage!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      if (err?.response?.status === 400) {
        setError('Need at least 10 messages to analyze. Keep chatting!');
      } else {
        setError('Failed to analyze preferences');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Settings className="h-4 w-4 mr-2" />
          AI Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" />
            AI Preferences
          </DialogTitle>
          <DialogDescription>
            Customize how the AI responds to you. These settings apply to all conversations.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Success Message */}
            {successMessage && (
              <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label htmlFor="custom-instructions" className="text-base font-semibold">
                Custom Instructions
              </Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Tell the AI about yourself, your role, and how you want it to respond.
              </p>
              <Textarea
                id="custom-instructions"
                placeholder="e.g., I'm a YouTuber focusing on tech reviews. I have 50K subscribers and want to grow to 100K. Keep responses practical and data-driven."
                value={preferences.custom_instructions || ''}
                onChange={(e) => setPreferences({ ...preferences, custom_instructions: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Response Style */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Response Style</Label>
              <RadioGroup
                value={preferences.response_style}
                onValueChange={(value) => setPreferences({ ...preferences, response_style: value })}
              >
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="concise" id="style-concise" />
                  <Label htmlFor="style-concise" className="flex-1 cursor-pointer">
                    <div className="font-medium">Concise</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Short, to-the-point responses
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="balanced" id="style-balanced" />
                  <Label htmlFor="style-balanced" className="flex-1 cursor-pointer">
                    <div className="font-medium">Balanced (Recommended)</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Mix of detail and brevity
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="detailed" id="style-detailed" />
                  <Label htmlFor="style-detailed" className="flex-1 cursor-pointer">
                    <div className="font-medium">Detailed</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Comprehensive, in-depth explanations
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="bullet_points" id="style-bullets" />
                  <Label htmlFor="style-bullets" className="flex-1 cursor-pointer">
                    <div className="font-medium">Bullet Points</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Organized lists and key points
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Expertise Level */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Expertise Level</Label>
              <RadioGroup
                value={preferences.expertise_level}
                onValueChange={(value) => setPreferences({ ...preferences, expertise_level: value })}
              >
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="beginner" id="exp-beginner" />
                  <Label htmlFor="exp-beginner" className="flex-1 cursor-pointer">
                    <div className="font-medium">Beginner</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Explain concepts simply, avoid jargon
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="intermediate" id="exp-intermediate" />
                  <Label htmlFor="exp-intermediate" className="flex-1 cursor-pointer">
                    <div className="font-medium">Intermediate (Recommended)</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Balance of explanation and depth
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="expert" id="exp-expert" />
                  <Label htmlFor="exp-expert" className="flex-1 cursor-pointer">
                    <div className="font-medium">Expert</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Technical details, advanced strategies
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Tone */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tone</Label>
              <RadioGroup
                value={preferences.tone}
                onValueChange={(value) => setPreferences({ ...preferences, tone: value })}
              >
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="professional" id="tone-professional" />
                  <Label htmlFor="tone-professional" className="flex-1 cursor-pointer">
                    <div className="font-medium">Professional</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Formal, business-focused
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="friendly" id="tone-friendly" />
                  <Label htmlFor="tone-friendly" className="flex-1 cursor-pointer">
                    <div className="font-medium">Friendly (Recommended)</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Warm, approachable, helpful
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="casual" id="tone-casual" />
                  <Label htmlFor="tone-casual" className="flex-1 cursor-pointer">
                    <div className="font-medium">Casual</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Relaxed, conversational
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Smart Analysis */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100 mb-1">
                    Smart Analysis
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                    Let AI analyze your chat history to suggest optimal settings based on your usage patterns.
                  </p>
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    variant="outline"
                    size="sm"
                    className="border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze My Usage
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving || loading}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
