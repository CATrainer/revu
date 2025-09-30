'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Sparkles,
  TrendingUp,
  BarChart3,
  Shield,
  Palette,
  Calendar,
  Target,
  Instagram,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  initial_prompt: string;
  system_instructions?: string;
  usage_count: number;
  is_active: boolean;
}

interface TemplateLibraryProps {
  onSelectTemplate: (template: Template) => void;
}

const categoryIcons: Record<string, typeof Sparkles> = {
  strategy: Target,
  content_creation: Sparkles,
  analytics: BarChart3,
  research: Search,
  management: Shield,
  branding: Palette,
  planning: Calendar,
  growth: TrendingUp,
  platform_specific: Instagram,
  business: DollarSign,
};

const categoryColors: Record<string, string> = {
  strategy: 'from-blue-500 to-blue-600',
  content_creation: 'from-purple-500 to-purple-600',
  analytics: 'from-green-500 to-green-600',
  research: 'from-orange-500 to-orange-600',
  management: 'from-red-500 to-red-600',
  branding: 'from-pink-500 to-pink-600',
  planning: 'from-amber-500 to-amber-600',
  growth: 'from-emerald-500 to-emerald-600',
  platform_specific: 'from-indigo-500 to-indigo-600',
  business: 'from-teal-500 to-teal-600',
};

export function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; count: number; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [usingTemplate, setUsingTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      const response = await api.get(`/chat/templates?${params.toString()}`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/chat/templates/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    setUsingTemplate(template.id);
    try {
      const response = await api.post(`/chat/templates/${template.id}/use`);
      onSelectTemplate({
        ...template,
        sessionId: response.data.session_id,
      } as Template & { sessionId: string });
    } catch (error) {
      console.error('Failed to use template:', error);
    } finally {
      setUsingTemplate(null);
    }
  };

  const handleSearch = () => {
    fetchTemplates();
  };

  const filteredTemplates = templates.filter((template) =>
    template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Sparkles className="h-4 w-4 mr-2" />
          Browse Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Conversation Templates
          </DialogTitle>
          <DialogDescription>
            Start with expert-crafted conversation starters for common social media tasks
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="flex gap-2 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="whitespace-nowrap">
              All Templates ({templates.length})
            </TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.category} value={cat.category} className="whitespace-nowrap">
                {cat.label} ({cat.count})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="flex-1 overflow-y-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No templates found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                {filteredTemplates.map((template) => {
                  const Icon = categoryIcons[template.category] || Sparkles;
                  const colorClass = categoryColors[template.category] || 'from-slate-500 to-slate-600';

                  return (
                    <Card
                      key={template.id}
                      className="group hover:shadow-lg transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer"
                      onClick={() => handleUseTemplate(template)}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 bg-gradient-to-br ${colorClass} rounded-lg shadow-sm`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {template.title}
                            </CardTitle>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {template.category.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm mb-3">
                          {template.description}
                        </CardDescription>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Used {template.usage_count} times
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={usingTemplate === template.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseTemplate(template);
                            }}
                            className="group-hover:bg-purple-100 dark:group-hover:bg-purple-950 transition-colors"
                          >
                            {usingTemplate === template.id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              'Use Template'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Popular Templates Section */}
        {selectedCategory === 'all' && !searchQuery && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Most Popular
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {templates
                .sort((a, b) => b.usage_count - a.usage_count)
                .slice(0, 5)
                .map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    disabled={usingTemplate === template.id}
                    className="whitespace-nowrap"
                  >
                    {template.title}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
