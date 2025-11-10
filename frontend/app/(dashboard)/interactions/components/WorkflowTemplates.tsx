'use client';

import { Sparkles, Flag, MessageSquare, Tag, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'support' | 'engagement' | 'moderation' | 'sales';
  trigger: any;
  conditions: any[];
  actions: any[];
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'auto-reply-pricing',
    name: 'Auto-Reply to Pricing Questions',
    description: 'Automatically respond to interactions asking about pricing with a helpful message',
    icon: <MessageSquare className="h-5 w-5" />,
    category: 'sales',
    trigger: {
      type: 'new_interaction',
      platforms: [],
      interaction_types: [],
    },
    conditions: [
      {
        type: 'natural_language',
        prompt: 'interactions asking about pricing, cost, or how much something costs',
      },
    ],
    actions: [
      {
        type: 'generate_response',
        config: {
          tone: 'friendly',
          require_approval: true,
        },
      },
    ],
  },
  {
    id: 'flag-negative-sentiment',
    name: 'Flag Negative Interactions',
    description: 'Automatically flag negative comments or messages for manual review',
    icon: <Flag className="h-5 w-5" />,
    category: 'moderation',
    trigger: {
      type: 'new_interaction',
      platforms: [],
      interaction_types: [],
    },
    conditions: [
      {
        field: 'sentiment',
        operator: 'equals',
        value: 'negative',
      },
    ],
    actions: [
      {
        type: 'flag_for_review',
        config: {
          priority_level: 'high',
        },
      },
      {
        type: 'add_tag',
        config: {
          tag: 'negative',
        },
      },
    ],
  },
  {
    id: 'tag-high-priority',
    name: 'Tag High Priority Interactions',
    description: 'Automatically tag interactions with high priority scores for quick visibility',
    icon: <Tag className="h-5 w-5" />,
    category: 'support',
    trigger: {
      type: 'new_interaction',
      platforms: [],
      interaction_types: [],
    },
    conditions: [
      {
        field: 'priority_score',
        operator: 'greater_or_equal',
        value: 80,
      },
    ],
    actions: [
      {
        type: 'add_tag',
        config: {
          tag: 'urgent',
        },
      },
      {
        type: 'flag_for_review',
        config: {
          priority_level: 'high',
        },
      },
    ],
  },
  {
    id: 'respond-verified-users',
    name: 'Priority Response for Verified Users',
    description: 'Generate responses for verified users with high engagement',
    icon: <Sparkles className="h-5 w-5" />,
    category: 'engagement',
    trigger: {
      type: 'new_interaction',
      platforms: [],
      interaction_types: [],
    },
    conditions: [
      {
        field: 'author_is_verified',
        operator: 'equals',
        value: true,
      },
    ],
    actions: [
      {
        type: 'generate_response',
        config: {
          tone: 'professional',
          require_approval: true,
        },
      },
      {
        type: 'add_tag',
        config: {
          tag: 'verified-user',
        },
      },
    ],
  },
  {
    id: 'auto-respond-support',
    name: 'Support Questions Auto-Response',
    description: 'Automatically respond to common support questions',
    icon: <MessageSquare className="h-5 w-5" />,
    category: 'support',
    trigger: {
      type: 'new_interaction',
      platforms: [],
      interaction_types: [],
    },
    conditions: [
      {
        type: 'natural_language',
        prompt: 'interactions asking for help, support, or technical assistance',
      },
    ],
    actions: [
      {
        type: 'generate_response',
        config: {
          tone: 'helpful',
          require_approval: true,
        },
      },
      {
        type: 'add_tag',
        config: {
          tag: 'support',
        },
      },
    ],
  },
  {
    id: 'engagement-boost',
    name: 'High Engagement Interactions',
    description: 'Flag interactions with high engagement (likes/replies) for follow-up',
    icon: <Zap className="h-5 w-5" />,
    category: 'engagement',
    trigger: {
      type: 'new_interaction',
      platforms: [],
      interaction_types: [],
    },
    conditions: [
      {
        field: 'like_count',
        operator: 'greater_than',
        value: 50,
      },
    ],
    actions: [
      {
        type: 'flag_for_review',
        config: {
          priority_level: 'medium',
        },
      },
      {
        type: 'add_tag',
        config: {
          tag: 'high-engagement',
        },
      },
    ],
  },
  {
    id: 'product-feedback',
    name: 'Product Feedback Collection',
    description: 'Tag and flag interactions containing product feedback or feature requests',
    icon: <MessageSquare className="h-5 w-5" />,
    category: 'support',
    trigger: {
      type: 'new_interaction',
      platforms: [],
      interaction_types: [],
    },
    conditions: [
      {
        type: 'natural_language',
        prompt: 'interactions with product feedback, feature requests, or suggestions for improvement',
      },
    ],
    actions: [
      {
        type: 'add_tag',
        config: {
          tag: 'product-feedback',
        },
      },
      {
        type: 'flag_for_review',
        config: {
          priority_level: 'medium',
        },
      },
    ],
  },
  {
    id: 'course-questions',
    name: 'Course Questions Auto-Handler',
    description: 'Automatically handle questions about your course content',
    icon: <Sparkles className="h-5 w-5" />,
    category: 'sales',
    trigger: {
      type: 'new_interaction',
      platforms: [],
      interaction_types: [],
    },
    conditions: [
      {
        type: 'natural_language',
        prompt: 'interactions asking about course content, curriculum, or what they will learn',
      },
    ],
    actions: [
      {
        type: 'generate_response',
        config: {
          tone: 'enthusiastic',
          require_approval: true,
        },
      },
      {
        type: 'add_tag',
        config: {
          tag: 'course-inquiry',
        },
      },
    ],
  },
];

const CATEGORY_COLORS = {
  support: 'bg-blue-500',
  engagement: 'bg-green-500',
  moderation: 'bg-red-500',
  sales: 'bg-purple-500',
};

const CATEGORY_LABELS = {
  support: 'Support',
  engagement: 'Engagement',
  moderation: 'Moderation',
  sales: 'Sales',
};

interface WorkflowTemplatesProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
}

export function WorkflowTemplates({ onSelectTemplate }: WorkflowTemplatesProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workflow Templates</DialogTitle>
          <DialogDescription>
            Choose from pre-built workflow templates to get started quickly
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {WORKFLOW_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${CATEGORY_COLORS[template.category]} bg-opacity-10`}>
                  {template.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                  <p className="text-xs text-secondary-dark">{template.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS[template.category]} bg-opacity-20`}>
                  {CATEGORY_LABELS[template.category]}
                </span>
                <Button size="sm" variant="ghost" className="h-7 text-xs">
                  Use Template
                </Button>
              </div>

              {/* Preview of conditions and actions */}
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                <div className="text-xs">
                  <span className="font-semibold text-secondary-dark">Conditions: </span>
                  <span className="text-muted-foreground">{template.conditions.length}</span>
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-secondary-dark">Actions: </span>
                  <span className="text-muted-foreground">{template.actions.length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
