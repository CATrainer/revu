// frontend/components/landing/SocialMediaInsights.tsx
'use client';

import { motion } from 'framer-motion';
import { Brain, TrendingUp, MessageSquare, Eye, Heart, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  platform: 'tiktok' | 'instagram' | 'youtube';
  icon: React.ComponentType<{ className?: string }>;
  metric: string;
  value: string;
  change: string;
  aiGenerated?: boolean;
}

const platformColors = {
  tiktok: 'from-black to-red-500',
  instagram: 'from-purple-500 via-pink-500 to-orange-500',
  youtube: 'from-red-600 to-red-500'
};

const platformLogos = {
  tiktok: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.854-1.3-1.964-1.3-3.206V.9h-3.091v13.822c-.045 1.077-.382 2.07-.95 2.795a3.69 3.69 0 0 1-2.804 1.286c-2.061 0-3.736-1.675-3.736-3.736s1.675-3.736 3.736-3.736c.38 0 .747.057 1.091.164V7.419a6.744 6.744 0 0 0-1.091-.09c-3.745 0-6.818 3.073-6.818 6.818s3.073 6.818 6.818 6.818 6.818-3.073 6.818-6.818V7.965a9.177 9.177 0 0 0 5.455 1.803V6.677a6.21 6.21 0 0 1-2.548-1.115Z"/>
    </svg>
  ),
  instagram: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  youtube: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
};

const insights: InsightCardProps[] = [
  {
    platform: 'tiktok',
    icon: Eye,
    metric: 'Views',
    value: '2.4M',
    change: '+47%',
    aiGenerated: false
  },
  {
    platform: 'instagram',
    icon: Heart,
    metric: 'Engagement',
    value: '12.8%',
    change: '+23%',
    aiGenerated: false
  },
  {
    platform: 'youtube',
    icon: Users,
    metric: 'Subscribers',
    value: '+1,247',
    change: '+34%',
    aiGenerated: false
  }
];

const aiFeatures = [
  {
    icon: Brain,
    title: 'AI Comment Responses',
    description: 'Auto-replies that match your voice across all platforms',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: TrendingUp,
    title: 'Growth Analytics',
    description: 'Data-driven insights to boost your following',
    color: 'from-holo-teal to-holo-teal-dark'
  },
  {
    icon: MessageSquare,
    title: 'Social Monitoring',
    description: 'Track what people say about you across platforms',
    color: 'from-holo-mint to-holo-mint-dark'
  }
];

export function SocialMediaInsights() {
  return (
    <div className="relative mx-auto max-w-6xl rounded-2xl shadow-2xl border border-muted bg-gradient-to-br from-[var(--card)] to-[var(--muted)] overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-muted bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Social AI Dashboard
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-2">
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-muted border border-border">
              <div className="w-2 h-2 rounded-full bg-holo-mint animate-pulse" />
              <span className="text-xs text-holo-mint font-medium">Live</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {Object.entries(platformLogos).map(([platform, logo]) => (
            <motion.div
              key={platform}
              className={cn(
                'p-2 rounded-lg bg-gradient-to-r text-white shadow-lg',
                platformColors[platform as keyof typeof platformColors]
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {logo}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Platform Metrics */}
        <div>
          <h3 className="text-lg font-semibold text-primary-dark mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-holo-teal" />
            <span>Platform Performance</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <motion.div
                key={`${insight.platform}-${insight.metric}`}
                className="relative p-4 rounded-xl bg-gradient-to-br from-white/50 to-white/20 dark:from-gray-800/50 dark:to-gray-900/20 border border-white/20 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    'p-2 rounded-lg bg-gradient-to-r text-white shadow-lg',
                    platformColors[insight.platform]
                  )}>
                    {platformLogos[insight.platform]}
                  </div>
                  <div className="flex items-center space-x-1 text-holo-mint">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">{insight.change}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-secondary-dark capitalize">{insight.platform} {insight.metric}</p>
                  <p className="text-2xl font-bold text-primary-dark">{insight.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI Features */}
        <div>
          <h3 className="text-lg font-semibold text-primary-dark mb-4 flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <span>AI-Powered Features</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="relative p-4 rounded-xl bg-gradient-to-br from-white/30 to-white/10 dark:from-gray-800/30 dark:to-gray-900/10 border border-white/20 backdrop-blur-sm group hover:bg-gradient-to-br hover:from-white/40 hover:to-white/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    'p-2 rounded-lg bg-gradient-to-r text-white shadow-lg group-hover:scale-110 transition-transform',
                    feature.color
                  )}>
                    <feature.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium text-primary-dark text-sm">{feature.title}</h4>
                    <p className="text-xs text-secondary-dark leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mock Comments with AI Responses */}
        <div>
          <h3 className="text-lg font-semibold text-primary-dark mb-4 flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-holo-teal" />
            <span>Recent AI Responses</span>
          </h3>
          <div className="space-y-3">
            {[
              { platform: 'tiktok', comment: 'Love this content! 🔥', response: 'Thank you so much! More amazing content coming your way! 🚀', time: '2m ago' },
              { platform: 'instagram', comment: 'How do you do this?', response: 'Great question! I use a combination of planning and creativity. Check my bio for tutorials! ✨', time: '5m ago' },
              { platform: 'youtube', comment: 'Please make more videos like this', response: 'Absolutely! I have a whole series planned. Subscribe to not miss any! 🎬', time: '12m ago' }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="p-3 rounded-lg bg-gradient-to-r from-white/20 to-white/10 dark:from-gray-800/20 dark:to-gray-900/10 border border-white/10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    'p-1.5 rounded-lg bg-gradient-to-r text-white shadow-sm',
                    platformColors[item.platform as keyof typeof platformColors]
                  )}>
                    {platformLogos[item.platform as keyof typeof platformLogos]}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="text-xs text-secondary-dark">&quot;{item.comment}&quot;</div>
                    <div className="flex items-start space-x-2">
                      <Brain className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-primary-dark italic">&quot;{item.response}&quot;</div>
                    </div>
                    <div className="text-xs text-secondary-dark opacity-70">{item.time}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-holo-teal/10 to-holo-teal-dark/10 rounded-full blur-xl animate-pulse delay-700" />
    </div>
  );
}
