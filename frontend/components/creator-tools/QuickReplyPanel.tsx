'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  Zap,
  Heart,
  ThumbsUp,
  HelpCircle,
  Clock,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';

interface QuickReplyTemplate {
  id: string;
  name: string;
  template: string;
  category: string;
  icon: string;
  variables: string[];
}

interface AISuggestion {
  text: string;
  tone: string;
  confidence: number;
}

interface QuickReplyPanelProps {
  interactionId: string;
  interactionContent: string;
  authorName?: string;
  platform: string;
  onSelectReply: (text: string) => void;
  className?: string;
}

const defaultTemplates: QuickReplyTemplate[] = [
  {
    id: 'thank-you',
    name: 'Thank You',
    template: 'Thank you so much for your kind words, {{author_name}}! I really appreciate the support! 🙏',
    category: 'appreciation',
    icon: '❤️',
    variables: ['author_name'],
  },
  {
    id: 'helpful-answer',
    name: 'Helpful Answer',
    template: 'Great question! {{answer}} Let me know if you have any other questions!',
    category: 'helpful',
    icon: '💡',
    variables: ['answer'],
  },
  {
    id: 'link-bio',
    name: 'Link in Bio',
    template: 'You can find more info in my bio link! 🔗',
    category: 'promo',
    icon: '🔗',
    variables: [],
  },
  {
    id: 'coming-soon',
    name: 'Coming Soon',
    template: "I'm working on that right now! Stay tuned, it's coming soon! 🎬",
    category: 'engagement',
    icon: '🎬',
    variables: [],
  },
  {
    id: 'appreciate-feedback',
    name: 'Appreciate Feedback',
    template: 'Thanks for the feedback! I always love hearing from my community. Your input helps me create better content! 💪',
    category: 'appreciation',
    icon: '💪',
    variables: [],
  },
  {
    id: 'collab-interest',
    name: 'Collab Interest',
    template: "Love the idea! DM me and let's chat about it! 🤝",
    category: 'business',
    icon: '🤝',
    variables: [],
  },
];

const toneOptions = [
  { id: 'friendly', label: 'Friendly', icon: '😊' },
  { id: 'professional', label: 'Professional', icon: '👔' },
  { id: 'casual', label: 'Casual', icon: '🤙' },
  { id: 'enthusiastic', label: 'Enthusiastic', icon: '🎉' },
  { id: 'grateful', label: 'Grateful', icon: '🙏' },
];

export function QuickReplyPanel({
  interactionId,
  interactionContent,
  authorName,
  platform,
  onSelectReply,
  className,
}: QuickReplyPanelProps) {
  const [templates, setTemplates] = useState<QuickReplyTemplate[]>(defaultTemplates);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAI, setShowAI] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load AI suggestions when panel opens
  useEffect(() => {
    generateAISuggestions();
  }, [interactionId, selectedTone]);

  const generateAISuggestions = async () => {
    try {
      setLoadingAI(true);
      const response = await api.post(`/creator/interactions/${interactionId}/ai-suggestion`, {
        tone: selectedTone,
        count: 3,
      });

      if (response.data.suggestions) {
        setAiSuggestions(response.data.suggestions);
      }
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
      // Generate fallback suggestions based on content analysis
      generateFallbackSuggestions();
    } finally {
      setLoadingAI(false);
    }
  };

  const generateFallbackSuggestions = () => {
    const content = interactionContent.toLowerCase();
    const suggestions: AISuggestion[] = [];

    // Analyze content and generate contextual suggestions
    if (content.includes('love') || content.includes('great') || content.includes('amazing')) {
      suggestions.push({
        text: `Thank you so much${authorName ? `, ${authorName}` : ''}! Your support means the world to me! 🙏❤️`,
        tone: 'grateful',
        confidence: 0.9,
      });
    }

    if (content.includes('?') || content.includes('how') || content.includes('what')) {
      suggestions.push({
        text: "Great question! I'll cover this in more detail in an upcoming video. Make sure you're subscribed so you don't miss it! 🔔",
        tone: 'helpful',
        confidence: 0.85,
      });
    }

    if (content.includes('collab') || content.includes('work together') || content.includes('partnership')) {
      suggestions.push({
        text: "I love the enthusiasm! Send me a DM with your ideas and let's see if we can make something happen! 🤝",
        tone: 'professional',
        confidence: 0.8,
      });
    }

    // Default suggestions if no specific context matches
    if (suggestions.length === 0) {
      suggestions.push(
        {
          text: `Thanks for watching and taking the time to comment${authorName ? `, ${authorName}` : ''}! Really appreciate you being part of this community! 💜`,
          tone: 'friendly',
          confidence: 0.75,
        },
        {
          text: "Glad you're enjoying the content! More videos coming soon - stay tuned! 🎬",
          tone: 'enthusiastic',
          confidence: 0.7,
        }
      );
    }

    setAiSuggestions(suggestions);
  };

  const handleTemplateClick = (template: QuickReplyTemplate) => {
    let text = template.template;

    // Replace variables
    if (template.variables.includes('author_name') && authorName) {
      text = text.replace('{{author_name}}', authorName);
    }

    // Remove unfilled variables
    text = text.replace(/\{\{[^}]+\}\}/g, '');

    onSelectReply(text.trim());
  };

  const handleAISuggestionClick = (suggestion: AISuggestion) => {
    onSelectReply(suggestion.text);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    pushToast('Copied to clipboard!', 'success');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* AI Suggestions Section */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setShowAI(!showAI)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <span className="font-semibold text-sm">AI-Powered Suggestions</span>
            {loadingAI && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {showAI ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAI && (
          <div className="px-4 pb-4 space-y-3">
            {/* Tone Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {toneOptions.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setSelectedTone(tone.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    selectedTone === tone.id
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  <span>{tone.icon}</span>
                  <span>{tone.label}</span>
                </button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={generateAISuggestions}
                disabled={loadingAI}
                className="ml-auto"
              >
                <RefreshCw className={cn('h-4 w-4', loadingAI && 'animate-spin')} />
              </Button>
            </div>

            {/* Suggestions */}
            {loadingAI ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="group relative p-3 rounded-lg border bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer"
                    onClick={() => handleAISuggestionClick(suggestion)}
                  >
                    <p className="text-sm pr-8">{suggestion.text}</p>
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(suggestion.text, `ai-${idx}`);
                        }}
                      >
                        {copiedId === `ai-${idx}` ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {Math.round(suggestion.confidence * 100)}% match
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {suggestion.tone}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No suggestions available
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Quick Templates Section */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <span className="font-semibold text-sm">Quick Templates</span>
          </div>
          {showTemplates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showTemplates && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className="flex items-center gap-2 p-3 rounded-lg border hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors text-left"
                >
                  <span className="text-lg">{template.icon}</span>
                  <span className="text-sm font-medium">{template.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
