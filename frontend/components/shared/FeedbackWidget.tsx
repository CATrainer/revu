'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Bug, Lightbulb, MessageCircle, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';

type FeedbackType = 'bug' | 'feature_request' | 'general' | 'improvement';

const feedbackTypes = [
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Report a problem or error' },
  { value: 'feature_request', label: 'Feature Request', icon: Lightbulb, description: 'Suggest a new feature' },
  { value: 'improvement', label: 'Improvement', icon: MessageSquare, description: 'Suggest an improvement' },
  { value: 'general', label: 'General Feedback', icon: MessageCircle, description: 'Share your thoughts' },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    feedback_type: 'general' as FeedbackType,
    title: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/feedback/submit', {
        ...formData,
        page_url: window.location.href,
      });

      setSubmitted(true);
      pushToast('Your feedback has been submitted successfully. Thank you!', 'success');

      // Reset form after 2 seconds
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setFormData({
          feedback_type: 'general',
          title: '',
          description: '',
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      pushToast('Failed to submit feedback. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = feedbackTypes.find(t => t.value === formData.feedback_type);
  const Icon = selectedType?.icon || MessageCircle;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-6 z-50 shadow-lg hover:shadow-xl transition-all bg-white dark:bg-gray-800 border-2 border-green-500 hover:border-green-600"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve Repruv by sharing your thoughts, reporting bugs, or suggesting features.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Thank You!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your feedback has been received. We appreciate your input!
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback_type">Feedback Type</Label>
              <Select
                value={formData.feedback_type}
                onValueChange={(value) => setFormData({ ...formData, feedback_type: value as FeedbackType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {feedbackTypes.map((type) => {
                    const TypeIcon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief summary of your feedback"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                minLength={3}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Please provide details about your feedback..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                minLength={10}
                maxLength={5000}
                rows={5}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.title.trim() || !formData.description.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Icon className="mr-2 h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
