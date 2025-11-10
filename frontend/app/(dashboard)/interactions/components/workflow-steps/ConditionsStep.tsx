'use client';

import { Plus, X, Sparkles, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Condition {
  // Natural language condition
  type?: 'natural_language';
  prompt?: string;

  // Field-based condition
  field?: string;
  operator?: string;
  value?: any;
}

interface ConditionsStepProps {
  conditions: Condition[];
  onUpdate: (conditions: Condition[]) => void;
}

const CONDITION_FIELDS = [
  { value: 'sentiment', label: 'Sentiment', type: 'select', options: ['positive', 'negative', 'neutral'] },
  { value: 'priority_score', label: 'Priority Score', type: 'number' },
  { value: 'content', label: 'Content Contains', type: 'text' },
  { value: 'author_username', label: 'Author Username', type: 'text' },
  { value: 'author_is_verified', label: 'Author is Verified', type: 'boolean' },
  { value: 'like_count', label: 'Like Count', type: 'number' },
  { value: 'reply_count', label: 'Reply Count', type: 'number' },
  { value: 'categories', label: 'Categories', type: 'text' },
];

const OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_or_equal', label: 'Greater than or equal' },
    { value: 'less_or_equal', label: 'Less than or equal' },
  ],
  select: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
  ],
  boolean: [
    { value: 'equals', label: 'Is' },
  ],
};

export function ConditionsStep({ conditions, onUpdate }: ConditionsStepProps) {
  const [conditionMode, setConditionMode] = useState<'simple' | 'natural'>('natural');

  const addSimpleCondition = () => {
    onUpdate([
      ...conditions,
      { field: 'sentiment', operator: 'equals', value: '' },
    ]);
  };

  const addNaturalLanguageCondition = () => {
    onUpdate([
      ...conditions,
      { type: 'natural_language', prompt: '' },
    ]);
  };

  const addCondition = () => {
    if (conditionMode === 'natural') {
      addNaturalLanguageCondition();
    } else {
      addSimpleCondition();
    }
  };

  const removeCondition = (index: number) => {
    onUpdate(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...updates };
    onUpdate(updated);
  };

  const getFieldType = (field: string) => {
    return CONDITION_FIELDS.find(f => f.value === field)?.type || 'text';
  };

  const getFieldOptions = (field: string) => {
    return CONDITION_FIELDS.find(f => f.value === field)?.options || [];
  };

  const isNaturalLanguageCondition = (condition: Condition) => {
    return condition.type === 'natural_language';
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-lg font-semibold text-primary-dark mb-4">
          What conditions must be met?
        </h3>
        <p className="text-sm text-secondary-dark mb-4">
          Define conditions using natural language or specific field filters. All conditions must be met for the workflow to run.
        </p>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
          <Button
            variant={conditionMode === 'natural' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setConditionMode('natural')}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Natural Language
          </Button>
          <Button
            variant={conditionMode === 'simple' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setConditionMode('simple')}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Field-Based
          </Button>
        </div>
      </div>

      {conditions.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <div className="mb-4">
            {conditionMode === 'natural' ? (
              <Sparkles className="h-12 w-12 mx-auto text-purple-500 mb-2" />
            ) : (
              <Settings2 className="h-12 w-12 mx-auto text-blue-500 mb-2" />
            )}
          </div>
          <p className="text-sm text-secondary-dark mb-2">
            {conditionMode === 'natural'
              ? 'Describe in plain English when this workflow should run'
              : 'No conditions added yet. This workflow will run for all matching triggers.'}
          </p>
          {conditionMode === 'natural' && (
            <p className="text-xs text-secondary-dark mb-4 max-w-md mx-auto">
              Examples: "interactions asking about pricing", "negative comments from verified users", "high priority questions about my course"
            </p>
          )}
          <Button onClick={addCondition} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            {conditionMode === 'natural' ? 'Add Natural Language Condition' : 'Add Field Condition'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div key={index} className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card">
              {isNaturalLanguageCondition(condition) ? (
                // Natural Language Condition
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <Label className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                      Natural Language Condition
                    </Label>
                  </div>
                  <Textarea
                    value={condition.prompt || ''}
                    onChange={(e) => updateCondition(index, { prompt: e.target.value })}
                    placeholder="Describe when this workflow should run... (e.g., 'interactions asking about pricing', 'negative comments from verified users')"
                    className="min-h-[80px] resize-none"
                  />
                  <p className="text-xs text-secondary-dark mt-2">
                    AI will evaluate each interaction against this condition
                  </p>
                </div>
              ) : (
                // Field-Based Condition
                <div className="flex-1 grid grid-cols-3 gap-3">
                  {/* Field Select */}
                  <div>
                    <Label className="text-xs">Field</Label>
                    <Select
                      value={condition.field}
                      onValueChange={(value) => {
                        const fieldType = getFieldType(value);
                        updateCondition(index, {
                          field: value,
                          operator: OPERATORS[fieldType as keyof typeof OPERATORS][0].value,
                          value: '',
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Operator Select */}
                  <div>
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(index, { operator: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS[getFieldType(condition.field || '') as keyof typeof OPERATORS].map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Value Input */}
                  <div>
                    <Label className="text-xs">Value</Label>
                    {getFieldType(condition.field || '') === 'select' ? (
                      <Select
                        value={condition.value}
                        onValueChange={(value) => updateCondition(index, { value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getFieldOptions(condition.field || '').map((option) => (
                            <SelectItem key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : getFieldType(condition.field || '') === 'boolean' ? (
                      <Select
                        value={condition.value?.toString() || 'true'}
                        onValueChange={(value) => updateCondition(index, { value: value === 'true' })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={getFieldType(condition.field || '') === 'number' ? 'number' : 'text'}
                        value={condition.value}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                        placeholder="Enter value..."
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCondition(index)}
                className="h-8 w-8 p-0 mt-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button onClick={addCondition} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {conditionMode === 'natural' ? 'Add Another Natural Language Condition' : 'Add Another Field Condition'}
          </Button>
        </div>
      )}

      {/* Info boxes */}
      <div className="space-y-3">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>All conditions must be met</strong> (AND logic). The workflow will only run when every condition is satisfied.
          </p>
        </div>

        {conditions.some(c => c.type === 'natural_language') && (
          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                  AI-Powered Conditions
                </p>
                <p className="text-xs text-purple-800 dark:text-purple-200">
                  Natural language conditions use AI to evaluate each interaction. Be specific and clear in your descriptions for best results.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
