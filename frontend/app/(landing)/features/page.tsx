'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React from 'react';
import { motion, LazyMotion, domAnimation, useInView } from "framer-motion";
import { FeaturesScrollNavigation } from '@/components/shared/FeaturesScrollNavigation';
import { 
} from 'lucide-react';
import { 
  FaChartBar, 
  FaBrain,
  FaHashtag,
  FaReply
} from 'react-icons/fa';

export default function FeaturesPage() {
  const heroRef = React.useRef(null);
  const responseRef = React.useRef(null);
  const socialRef = React.useRef(null);
  const aiRef = React.useRef(null);
  const analyticsRef = React.useRef(null);
  const ctaRef = React.useRef(null);

  const heroInView = useInView(heroRef, { once: false, amount: 0.2 });
  const responseInView = useInView(responseRef, { once: false, amount: 0.2 });
  const socialInView = useInView(socialRef, { once: false, amount: 0.2 });
  const aiInView = useInView(aiRef, { once: false, amount: 0.2 });
  const analyticsInView = useInView(analyticsRef, { once: false, amount: 0.2 });
  const ctaInView = useInView(ctaRef, { once: false, amount: 0.2 });

  return (
    <LazyMotion features={domAnimation}>
      <div className="py-24 section-background">
        {/* Hero */}
        <motion.section 
          id="hero"
          ref={heroRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-32"
          initial={{ opacity: 0, y: 30 }}
          animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1 
            className="text-4xl md:text-5xl font-bold brand-text mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: heroInView ? 0.2 : 0 }}
          >
            Everything You Need to Manage Reputation Like a Pro
          </motion.h1>
          <motion.p 
            className="text-xl text-primary-dark font-bold mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: heroInView ? 0.4 : 0 }}
          >
            From centralized management to AI-powered insights, discover all the features that make Repruv the ultimate reputation management platform
          </motion.p>

          {/* Quick Feature Navigation */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: heroInView ? 0.6 : 0 }}
          >
            {[
              { 
                icon: FaReply, 
                color: "text-blue-500", 
                title: "Response Automation", 
                id: "response-automation" 
              },
              { 
                icon: FaHashtag, 
                color: "text-pink-500", 
                title: "Social Monitoring", 
                id: "social-monitoring" 
              },
              { 
                icon: FaBrain, 
                color: "text-purple-500", 
                title: "AI Responses", 
                id: "ai-responses" 
              },
              { 
                icon: FaChartBar, 
                color: "text-green-500", 
                title: "Analytics & Reports", 
                id: "analytics-and-reports" 
              }
            ].map((feature, index) => (
              <motion.button
                key={feature.id}
                onClick={() => {
                  const element = document.getElementById(feature.id);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className="group flex flex-col items-center p-4 rounded-xl card-background hover:shadow-lg transition-all duration-300 hover:scale-105 border border-transparent hover:border-green-200"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={heroInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
                transition={{ duration: 0.6, delay: heroInView ? 0.8 + (index * 0.1) : 0 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="mb-3"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <feature.icon className={`${feature.color} h-8 w-8 group-hover:drop-shadow-lg transition-all duration-300`} />
                </motion.div>
                <span className="text-sm font-medium text-center brand-text group-hover:text-green-600 transition-colors duration-300">
                  {feature.title}
                </span>
              </motion.button>
            ))}
          </motion.div>
        </motion.section>

        {/* Response Automation Section */}
        <motion.section 
          id="response-automation" 
          ref={responseRef}
          className="theme-response max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 mb-32"
          initial={{ opacity: 0, y: 50 }}
          animate={responseInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={responseInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.8, delay: responseInView ? 0.2 : 0 }}
            >
              <motion.div 
                className="flex items-center gap-3 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={responseInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: responseInView ? 0.3 : 0 }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={responseInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                  transition={{ duration: 0.6, delay: responseInView ? 0.4 : 0 }}
                >
                  <FaReply className="text-blue-500 h-12 w-12" />
                </motion.div>
                <motion.h2 
                  className="text-3xl font-bold brand-text"
                  initial={{ opacity: 0, x: -20 }}
                  animate={responseInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.6, delay: responseInView ? 0.5 : 0 }}
                >
                  Response Automation
                </motion.h2>
              </motion.div>
              <motion.p 
                className="text-lg text-primary-dark font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={responseInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: responseInView ? 0.5 : 0 }}
              >
                Automate replies to comments on your reels/videos and direct messages centrally on TikTok, YouTube and Instagram.
              </motion.p>
              <motion.ul 
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={responseInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.6, delay: responseInView ? 0.6 : 0 }}
              >
                {[
                  'Centralized management across TikTok, YouTube, and Instagram',
                  'Smart auto-responses for common queries',
                  'Custom response templates and triggers',
                  'Bulk reply functionality for efficiency',
                  'Real-time sync with all connected platforms'
                ].map((item, index) => (
                  <motion.li 
                    key={index}
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={responseInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: responseInView ? 0.8 + (index * 0.1) : 0 }}
                  >
                    <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                    <span className="text-body-dark">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
            <motion.div 
              className="card-background-light rounded-lg p-8 h-96 flex items-center justify-center transition-transform duration-300 hover:scale-105"
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={responseInView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.8, delay: responseInView ? 0.4 : 0 }}
            >
              {/* Response Automation UI Mockup */}
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-700">Response Center</h4>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600">Auto Mode</span>
                  </div>
                </div>
                
                {/* Platform tabs */}
                <div className="flex gap-2 mb-4">
                  <div className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">TikTok</div>
                  <div className="px-3 py-1 bg-red-600 text-white text-xs rounded-full">YouTube</div>
                  <div className="px-3 py-1 bg-pink-600 text-white text-xs rounded-full">Instagram</div>
                </div>
                
                {/* Comment responses */}
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-blue-400">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">@</div>
                          <span className="text-xs font-medium text-gray-700">New Comment</span>
                          <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Auto-replied</div>
                        </div>
                        <span className="text-xs text-gray-500">{i}m ago</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">"Love your content! How do I get started?"</p>
                      <div className="bg-blue-50 rounded p-2">
                        <p className="text-xs text-blue-700">"Thank you! Check out our beginner's guide in our bio link 🎯"</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Stats */}
                <div className="absolute bottom-4 right-4 bg-white rounded-lg p-2 shadow">
                  <div className="text-xs text-blue-600">24 replies today</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Social Monitoring Section */}
        <motion.section 
          id="social-monitoring" 
          ref={socialRef}
          className="theme-social section-background-alt py-32 mb-32"
          initial={{ opacity: 0, y: 50 }}
          animate={socialInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div 
                className="order-2 md:order-1 card-background rounded-lg p-8 h-96 flex items-center justify-center shadow-sm transition-transform duration-300 hover:scale-105"
                initial={{ opacity: 0, x: -50 }}
                animate={socialInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {/* Social Monitoring UI Mockup */}
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-pink-50 rounded-lg p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-700">Social Monitoring</h4>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600">Live Feed</span>
                    </div>
                  </div>
                  
                  {/* Platform toggles */}
                  <div className="flex gap-2 mb-4">
                    <div className="px-2 py-1 bg-blue-600 text-white text-xs rounded flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-400 rounded"></div>
                      Facebook
                    </div>
                    <div className="px-2 py-1 bg-pink-600 text-white text-xs rounded flex items-center gap-1">
                      <div className="w-3 h-3 bg-pink-400 rounded"></div>
                      Instagram
                    </div>
                    <div className="px-2 py-1 bg-gray-600 text-white text-xs rounded flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-400 rounded"></div>
                      Twitter
                    </div>
                  </div>
                  
                  {/* Social mentions */}
                  <div className="space-y-3">
                    {[
                      { platform: 'Instagram', user: '@foodie_jane', content: 'Amazing dinner at @restaurant! 🍝✨', sentiment: 'positive', time: '2m ago' },
                      { platform: 'Facebook', user: 'Mike Chen', content: 'Great service and atmosphere!', sentiment: 'positive', time: '15m ago' },
                      { platform: 'Twitter', user: '@critic_bob', content: 'Food was okay, but slow service...', sentiment: 'neutral', time: '1h ago' }
                    ].map((mention, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-pink-400">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${mention.platform === 'Instagram' ? 'bg-pink-500' : mention.platform === 'Facebook' ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
                            <span className="text-xs font-medium text-gray-700">{mention.user}</span>
                            <div className={`w-2 h-2 rounded-full ${mention.sentiment === 'positive' ? 'bg-green-500' : mention.sentiment === 'neutral' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                          </div>
                          <span className="text-xs text-gray-500">{mention.time}</span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{mention.content}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Stats summary */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg p-2 shadow flex justify-between">
                    <div className="text-center">
                      <div className="text-xs font-bold text-pink-600">+24</div>
                      <div className="text-xs text-gray-500">Mentions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-green-600">89%</div>
                      <div className="text-xs text-gray-500">Positive</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-blue-600">4.2k</div>
                      <div className="text-xs text-gray-500">Reach</div>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div 
                className="order-1 md:order-2"
                initial={{ opacity: 0, x: 50 }}
                animate={socialInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={socialInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                  >
                    <FaHashtag className="text-pink-500 h-12 w-12" />
                  </motion.div>
                  <h2 className="text-3xl font-bold brand-text">Social Monitoring</h2>
                </div>
                <p className="text-lg text-primary-dark font-bold mb-6">
                  Track text sentiment, @ mentions and hashtags and keep on top of what people are saying about you on social media.
                </p>
                <motion.ul 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={socialInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  {[
                    'Monitor Facebook, Instagram, Twitter, and TikTok',
                    'Real-time sentiment analysis and alerts',
                    'Hashtag and keyword tracking across platforms',
                    '@ mention identification and notifications',
                    'Automated threat and opportunity detection'
                  ].map((item, index) => (
                    <motion.li 
                      key={index}
                      className="flex items-start"
                      initial={{ opacity: 0, x: -20 }}
                      animate={socialInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                      transition={{ duration: 0.4, delay: 1.0 + (index * 0.1) }}
                    >
                      <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                      <span className="text-body-dark">{item}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Analytics and Reports Section */}
        <motion.section 
          id="analytics-and-reports" 
          ref={analyticsRef}
          className="theme-analytics max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 mb-32"
          initial={{ opacity: 0, y: 50 }}
          animate={analyticsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={analyticsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={analyticsInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <FaChartBar className="text-green-500 h-12 w-12" />
                </motion.div>
                <h2 className="text-3xl font-bold brand-text">Analytics & Reports</h2>
              </div>
              <p className="text-lg text-primary-dark font-bold mb-6">
                Get actionable insights with comprehensive reporting and analytics derived from your review data.
              </p>
              <motion.ul 
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={analyticsInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                {[
                  'Performance metrics and KPIs',
                  'Sentiment trend analysis',
                  'Custom reporting dashboards',
                  'Automated report generation',
                  'Export data in multiple formats'
                ].map((item, index) => (
                  <motion.li 
                    key={index}
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={analyticsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: 0.8 + (index * 0.1) }}
                  >
                    <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                    <span className="text-body-dark">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
            <motion.div 
              className="card-background-light rounded-lg p-8 h-96 flex items-center justify-center transition-transform duration-300 hover:scale-105"
              initial={{ opacity: 0, x: 50 }}
              animate={analyticsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {/* Analytics Dashboard UI Mockup */}
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-green-50 rounded-lg p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-700">Analytics Dashboard</h4>
                  <div className="flex gap-2">
                    <div className="px-2 py-1 bg-green-600 text-white text-xs rounded">This Month</div>
                    <div className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">Export</div>
                  </div>
                </div>
                
                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Total Reviews</div>
                    <div className="text-lg font-bold text-gray-800">1,247</div>
                    <div className="text-xs text-green-600">+12% ↗</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Avg Rating</div>
                    <div className="text-lg font-bold text-gray-800">4.6</div>
                    <div className="text-xs text-green-600">+0.2 ↗</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Response Rate</div>
                    <div className="text-lg font-bold text-gray-800">94%</div>
                    <div className="text-xs text-green-600">+8% ↗</div>
                  </div>
                </div>
                
                {/* Chart visualization */}
                <div className="bg-white rounded-lg p-3 shadow-sm mb-4">
                  <div className="text-xs font-medium text-gray-700 mb-2">Review Volume Trend</div>
                  <div className="flex items-end justify-between h-20 gap-1">
                    {[45, 52, 38, 61, 57, 69, 74, 68, 82, 79, 91, 87].map((height, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-green-400 to-green-600 rounded-t opacity-80" style={{height: `${(height/100) * 100}%`}}></div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Jan</span>
                    <span>Jun</span>
                    <span>Dec</span>
                  </div>
                </div>
                
                {/* Platform breakdown - keeping platform brand colors */}
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-xs font-medium text-gray-700 mb-2">Platform Distribution</div>
                  <div className="space-y-2">
                    {[
                      { name: 'Google', percentage: 45, color: 'bg-blue-500' },
                      { name: 'Facebook', percentage: 30, color: 'bg-blue-600' },
                      { name: 'Yelp', percentage: 25, color: 'bg-red-500' }
                    ].map((platform, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${platform.color}`}></div>
                        <span className="text-xs text-gray-600 flex-1">{platform.name}</span>
                        <span className="text-xs font-medium text-gray-800">{platform.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Status indicator */}
                <div className="absolute bottom-4 right-4 bg-green-100 border border-green-300 rounded-lg p-2">
                  <div className="text-xs text-green-700">📈 Performance: Excellent</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* AI Responses Section */}
        <motion.section 
          id="ai-responses" 
          ref={aiRef}
          className="theme-ai max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 mb-32"
          initial={{ opacity: 0, y: 50 }}
          animate={aiInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div 
                className="order-2 md:order-1 card-background rounded-lg p-8 h-96 flex items-center justify-center shadow-sm transition-transform duration-300 hover:scale-105"
                initial={{ opacity: 0, x: -50 }}
                animate={aiInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {/* Team Collaboration UI Mockup */}
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-green-50 rounded-lg p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-700">Team Workspace</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white"></div>
                        <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                        <div className="w-5 h-5 bg-purple-500 rounded-full border-2 border-white"></div>
                      </div>
                      <span className="text-xs text-green-600">3 online</span>
                    </div>
                  </div>
                  
                  {/* Task board */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-white rounded-lg p-2 shadow-sm">
                      <div className="text-xs font-medium text-gray-700 mb-2">To Review</div>
                      <div className="space-y-2">
                        {[1, 2].map(i => (
                          <div key={i} className="bg-gray-100 rounded p-2 border-l-2 border-gray-400">
                            <div className="text-xs text-gray-700">Review #{i + 123}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-xs text-gray-500">Sarah</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-2 shadow-sm">
                      <div className="text-xs font-medium text-gray-700 mb-2">In Progress</div>
                      <div className="space-y-2">
                        <div className="bg-green-100 rounded p-2 border-l-2 border-green-400">
                          <div className="text-xs text-gray-700">Response Draft</div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-500">Mike</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-2 shadow-sm">
                      <div className="text-xs font-medium text-gray-700 mb-2">Completed</div>
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="bg-green-100 rounded p-2 border-l-2 border-green-400">
                            <div className="text-xs text-gray-700">Review #{i + 120}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <span className="text-xs text-gray-500">Alex</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Team chat */}
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-xs font-medium text-gray-700 mb-2">Team Chat</div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-600"><span className="font-medium">Sarah:</span> Finished reviewing the batch from today</div>
                          <div className="text-xs text-gray-400">2 min ago</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-600"><span className="font-medium">Mike:</span> Working on the negative review response</div>
                          <div className="text-xs text-gray-400">5 min ago</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Notifications */}
                  <div className="absolute bottom-4 right-4 bg-green-100 border border-green-300 rounded-lg p-2">
                    <div className="text-xs text-green-700">🔔 3 new assignments</div>
                  </div>
                </div>
              </motion.div>
              <motion.div 
                className="order-1 md:order-2"
                initial={{ opacity: 0, x: 50 }}
                animate={aiInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={aiInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                  >
                    <FaBrain className="text-purple-500 h-12 w-12" />
                  </motion.div>
                  <h2 className="text-3xl font-bold brand-text">AI Responses</h2>
                </div>
                <p className="text-lg text-primary-dark font-bold mb-6">
                  Generate intelligent, personalized responses using advanced AI that understands context and tone.
                </p>
                <motion.ul 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={aiInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  {[
                    'Context-aware response generation',
                    'Tone matching and personalization',
                    'Multi-language support',
                    'Brand voice consistency',
                    'Learning from your feedback'
                  ].map((item, index) => (
                    <motion.li 
                      key={index}
                      className="flex items-start"
                      initial={{ opacity: 0, x: -20 }}
                      animate={aiInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                      transition={{ duration: 0.4, delay: 1.0 + (index * 0.1) }}
                    >
                      <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                      <span className={index === 4 ? "text-body-dark" : "text-body-dark"}>{item}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section 
          ref={ctaRef}
          className="py-24 section-background-alt"
          initial={{ opacity: 0, y: 50 }}
          animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <motion.h2 
              className="text-3xl font-bold text-primary-dark mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: ctaInView ? 0.2 : 0 }}
            >
              Ready to Transform Your Review Management?
            </motion.h2>
            <motion.p 
              className="text-xl text-primary-dark font-bold mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: ctaInView ? 0.4 : 0 }}
            >
              Join hundreds of businesses already using Repruv to save time and grow
            </motion.p>
            <motion.div 
              className="flex justify-center gap-4"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={ctaInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
              transition={{ duration: 0.6, delay: ctaInView ? 0.6 : 0 }}
            >
              <Button size="lg" className="button-primary" asChild>
                <Link href="/join-waitlist">Get Early Access</Link>
              </Button>
              <Button size="lg" className="button-secondary" asChild>
                <Link href="/demo">Request Demo</Link>
              </Button>
            </motion.div>
          </div>
        </motion.section>
    </div>
    
    {/* Features Scroll Navigation */}
    <FeaturesScrollNavigation />
  </LazyMotion>
);
}