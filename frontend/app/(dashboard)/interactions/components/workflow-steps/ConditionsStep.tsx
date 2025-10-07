'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Condition {
  field: string;
  operator: string;
  value: any;
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
  const addCondition = () => {
    onUpdate([
      ...conditions,
      { field: 'sentiment', operator: 'equals', value: '' },
    ]);
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-lg font-semibold text-primary-dark mb-4">
          What conditions must be met?
        </h3>
        <p className="text-sm text-secondary-dark">
          Add conditions to filter which interactions this workflow applies to. Leave empty to match all interactions.
        </p>
      </div>

      {conditions.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-sm text-secondary-dark mb-4">
            No conditions added yet. This workflow will run for all matching triggers.
          </p>
          <Button onClick={addCondition} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add First Condition
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div key={index} className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card">
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
                      {OPERATORS[getFieldType(condition.field) as keyof typeof OPERATORS].map((op) => (
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
                  {getFieldType(condition.field) === 'select' ? (
                    <Select
                      value={condition.value}
                      onValueChange={(value) => updateCondition(index, { value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getFieldOptions(condition.field).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : getFieldType(condition.field) === 'boolean' ? (
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
                      type={getFieldType(condition.field) === 'number' ? 'number' : 'text'}
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder="Enter value..."
                      className="mt-1"
                    />
                  )}
                </div>
              </div>

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
            Add Another Condition
          </Button>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>All conditions must be met</strong> (AND logic). The workflow will only run when every condition is satisfied.
        </p>
      </div>
    </div>
  );
}
