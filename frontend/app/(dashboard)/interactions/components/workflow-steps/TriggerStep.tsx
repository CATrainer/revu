'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TriggerStepProps {
  trigger: {
    type: string;
    platforms?: string[];
    interaction_types?: string[];
  };
  onUpdate: (trigger: any) => void;
}

const PLATFORMS = [
  { value: 'youtube', label: 'YouTube', icon: '🎥' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'twitter', label: 'Twitter/X', icon: '🐦' },
];

const INTERACTION_TYPES = [
  { value: 'comment', label: 'Comments' },
  { value: 'dm', label: 'Direct Messages' },
  { value: 'mention', label: 'Mentions' },
];

export function TriggerStep({ trigger, onUpdate }: TriggerStepProps) {
  const togglePlatform = (platform: string) => {
    const platforms = trigger.platforms || [];
    const updated = platforms.includes(platform)
      ? platforms.filter(p => p !== platform)
      : [...platforms, platform];
    onUpdate({ ...trigger, platforms: updated });
  };

  const toggleInteractionType = (type: string) => {
    const types = trigger.interaction_types || [];
    const updated = types.includes(type)
      ? types.filter(t => t !== type)
      : [...types, type];
    onUpdate({ ...trigger, interaction_types: updated });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-primary-dark mb-4">When should this workflow run?</h3>
        <p className="text-sm text-secondary-dark">
          Define the trigger that starts this workflow.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Trigger Event</Label>
          <Select
            value={trigger.type}
            onValueChange={(value) => onUpdate({ ...trigger, type: value })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_interaction">New Interaction Received</SelectItem>
              <SelectItem value="interaction_updated">Interaction Updated</SelectItem>
              <SelectItem value="manual">Manual Trigger Only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-secondary-dark mt-1.5">
            {trigger.type === 'new_interaction' && 'Runs when a new comment, DM, or mention is received'}
            {trigger.type === 'interaction_updated' && 'Runs when an existing interaction is modified'}
            {trigger.type === 'manual' && 'Only runs when manually triggered by you'}
          </p>
        </div>

        {trigger.type === 'new_interaction' && (
          <>
            <div className="border-t border-border pt-4">
              <Label>Filter by Platform (optional)</Label>
              <p className="text-xs text-secondary-dark mb-3">
                Leave all unchecked to run on all platforms
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORMS.map((platform) => (
                  <label
                    key={platform.value}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={trigger.platforms?.includes(platform.value)}
                      onCheckedChange={() => togglePlatform(platform.value)}
                    />
                    <span className="text-lg">{platform.icon}</span>
                    <span className="text-sm font-medium">{platform.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <Label>Filter by Interaction Type (optional)</Label>
              <p className="text-xs text-secondary-dark mb-3">
                Leave all unchecked to run on all types
              </p>
              <div className="grid grid-cols-3 gap-3">
                {INTERACTION_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={trigger.interaction_types?.includes(type.value)}
                      onCheckedChange={() => toggleInteractionType(type.value)}
                    />
                    <span className="text-sm font-medium">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
