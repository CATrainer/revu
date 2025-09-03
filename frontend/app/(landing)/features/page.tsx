'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React from 'react';
import { motion, LazyMotion, domAnimation, useInView } from 'framer-motion';
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
            Everything You Need to Manage Community Engagement Like a Pro
          </motion.h1>
          <motion.p 
            className="text-xl text-primary-dark font-bold mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: heroInView ? 0.4 : 0 }}
          >
            From multi-platform comment management to AI-powered insights, discover all the features that make Repruv the ultimate Community Engagement platform
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
                title: "Comment Automation", 
                id: "comment-automation" 
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
                title: "AI Chatbot", 
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

        {/* Comment Automation Section */}
        <motion.section 
          id="comment-automation" 
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
                  Comment Automation
                </motion.h2>
              </motion.div>
              <motion.p 
                className="text-lg text-primary-dark font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={responseInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: responseInView ? 0.5 : 0 }}
              >
                Automate replies to Comments on your Reels/Videos on YouTube and Instagram.
              </motion.p>
              <motion.ul 
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={responseInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.6, delay: responseInView ? 0.6 : 0 }}
              >
                  {[
                    'View all comments from YouTube and Instagram in our dashboard.',
                    'Manual response to any comments.',
                    'Define rules for Repruv AI to follow and respond autonomously on your behalf.',
                    'Built in approval system for responses that need your attention',
                    'Automated comment moderation.'
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
              {/* Comment Automation Enhanced UI Mockup */}
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 relative overflow-hidden border border-blue-200 shadow-lg">
                {/* Header with logo and controls */}
                <div className="flex items-center justify-between mb-3 border-b border-blue-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-600 rounded-md w-6 h-6 flex items-center justify-center text-white font-bold text-xs">R</div>
                    <h4 className="text-sm font-semibold text-gray-800">Repruv Comment Manager</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full border border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-blue-700">Auto Mode</span>
                    </div>
                    <div className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-full w-5 h-5 flex items-center justify-center cursor-pointer">
                      <span className="text-white text-xs">⚙️</span>
                    </div>
                  </div>
                </div>
                
                {/* Platform tabs with better visuals */}
                <div className="flex gap-1 mb-3">
                  <div className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium rounded-md flex items-center gap-1 shadow-sm">
                    <span className="text-xs">▶️</span> YouTube
                  </div>
                  <div className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-medium rounded-md flex items-center gap-1 shadow-sm">
                    <span className="text-xs">📷</span> Instagram
                  </div>
                  <div className="px-3 py-1.5 bg-gradient-to-r from-black to-gray-800 text-white text-xs font-medium rounded-md flex items-center gap-1 shadow-sm">
                    <span className="text-xs">🎵</span> TikTok
                  </div>
                </div>
                
                {/* Dashboard stats */}
                <div className="grid grid-cols-3 gap-1 mb-2">
                  <div className="bg-white rounded-md p-1.5 border border-blue-100 shadow-sm">
                    <div className="text-xs text-gray-500">Unread</div>
                    <div className="font-semibold text-blue-700">18</div>
                  </div>
                  <div className="bg-white rounded-md p-1.5 border border-blue-100 shadow-sm">
                    <div className="text-xs text-gray-500">Auto-replied</div>
                    <div className="font-semibold text-green-600">42</div>
                  </div>
                  <div className="bg-white rounded-md p-1.5 border border-blue-100 shadow-sm">
                    <div className="text-xs text-gray-500">Pending</div>
                    <div className="font-semibold text-orange-500">7</div>
                  </div>
                </div>
                
                {/* Comment responses with better styling */}
                <div className="space-y-2 overflow-auto max-h-[calc(100%-130px)]">
                  <div className="bg-white rounded-lg p-2 shadow-sm border-l-4 border-red-500 relative">
                    <div className="absolute -left-1 top-2 w-2 h-2 bg-red-500 rounded-full"></div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">YT</div>
                        <span className="text-xs font-medium text-gray-700">@johndoe</span>
                        <div className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-sm">Auto</div>
                      </div>
                      <span className="text-xs text-gray-500">2m</span>
                    </div>
                    <p className="text-xs text-gray-700 mb-1 border-l-2 border-gray-200 pl-2">&quot;I love your content! When is your next tutorial coming out?&quot;</p>
                    <div className="bg-blue-50 rounded p-1.5 border-l-2 border-blue-300">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-medium text-blue-700">AI Response</span>
                      </div>
                      <p className="text-xs text-gray-700">&quot;Thanks for your support! 🙏 My next tutorial drops this Friday at 3pm EST. Turn on notifications so you don&apos;t miss it! 🔔&quot;</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-2 shadow-sm border-l-4 border-pink-500 relative">
                    <div className="absolute -left-1 top-2 w-2 h-2 bg-pink-500 rounded-full"></div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs">IG</div>
                        <span className="text-xs font-medium text-gray-700">@travel_addict</span>
                        <div className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-sm">Needs Review</div>
                      </div>
                      <span className="text-xs text-gray-500">8m</span>
                    </div>
                    <p className="text-xs text-gray-700 mb-1 border-l-2 border-gray-200 pl-2">&quot;What camera do you use for your stunning photos?&quot;</p>
                    <div className="bg-yellow-50 rounded p-1.5 border-l-2 border-yellow-300">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-xs font-medium text-yellow-700">Draft Response</span>
                        </div>
                        <div className="flex gap-1">
                          <button className="bg-green-100 hover:bg-green-200 text-green-700 text-xs px-1.5 rounded">✓</button>
                          <button className="bg-red-100 hover:bg-red-200 text-red-700 text-xs px-1.5 rounded">✕</button>
                          <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs px-1.5 rounded">✎</button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700">&quot;I use a Sony Alpha a7III for most of my shots. I&apos;ve listed all my gear in my profile link! 📸 #Photography&quot;</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-2 shadow-sm border-l-4 border-black relative">
                    <div className="absolute -left-1 top-2 w-2 h-2 bg-black rounded-full"></div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center text-white text-xs">TT</div>
                        <span className="text-xs font-medium text-gray-700">@dance_queen</span>
                        <div className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-sm">Auto</div>
                      </div>
                      <span className="text-xs text-gray-500">12m</span>
                    </div>
                    <p className="text-xs text-gray-700 mb-1 border-l-2 border-gray-200 pl-2">&quot;This routine is amazing! Can you do a tutorial?&quot;</p>
                    <div className="bg-blue-50 rounded p-1.5 border-l-2 border-blue-300">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-medium text-blue-700">AI Response</span>
                      </div>
                      <p className="text-xs text-gray-700">&quot;Thank you! 💃 I&apos;ll be posting a step-by-step tutorial next week! Make sure to follow so you don&apos;t miss it!&quot;</p>
                    </div>
                  </div>
                </div>
                
                {/* Controls and status bar */}
                <div className="absolute bottom-2 left-2 right-2 bg-white rounded-md p-1.5 shadow-sm border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded transition-colors">Refresh</button>
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded transition-colors">Rules</button>
                  </div>
                  <div className="text-xs text-blue-600 font-medium">24 replies today • 98% auto-handled</div>
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
                {/* Enhanced Social Monitoring UI Mockup */}
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-pink-50 rounded-lg p-4 relative overflow-hidden border border-pink-200 shadow-lg">
                  {/* Header with logo and status */}
                  <div className="flex items-center justify-between mb-3 border-b border-pink-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-pink-600 rounded-md w-6 h-6 flex items-center justify-center text-white font-bold text-xs">R</div>
                      <h4 className="text-sm font-semibold text-gray-800">Repruv Social Monitor</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-green-700">Live Feed</span>
                      </div>
                      <div className="bg-pink-500 hover:bg-pink-600 transition-colors rounded-full w-5 h-5 flex items-center justify-center cursor-pointer">
                        <span className="text-white text-xs">⚙️</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Main dashboard layout */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {/* Left column - Platform filters */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-gray-700 mb-1 px-1">Platforms</div>
                      <div className="px-2 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-xs rounded-md flex items-center justify-between mb-1 shadow-sm">
                        <span className="flex items-center gap-1">
                          <span className="text-xs">📷</span> Instagram
                        </span>
                        <span className="bg-white text-pink-600 rounded-full text-xs w-4 h-4 flex items-center justify-center">✓</span>
                      </div>
                      <div className="px-2 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded-md flex items-center justify-between mb-1 shadow-sm">
                        <span className="flex items-center gap-1">
                          <span className="text-xs">👍</span> Facebook
                        </span>
                        <span className="bg-white text-blue-600 rounded-full text-xs w-4 h-4 flex items-center justify-center">✓</span>
                      </div>
                      <div className="px-2 py-1.5 bg-gradient-to-r from-sky-500 to-sky-600 text-white text-xs rounded-md flex items-center justify-between mb-1 shadow-sm">
                        <span className="flex items-center gap-1">
                          <span className="text-xs">🐦</span> Twitter/X
                        </span>
                        <span className="bg-white text-sky-600 rounded-full text-xs w-4 h-4 flex items-center justify-center">✓</span>
                      </div>
                      <div className="px-2 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-md flex items-center justify-between mb-1 shadow-sm">
                        <span className="flex items-center gap-1">
                          <span className="text-xs">▶️</span> YouTube
                        </span>
                        <span className="bg-white text-red-600 rounded-full text-xs w-4 h-4 flex items-center justify-center">✓</span>
                      </div>
                      <div className="px-2 py-1.5 bg-gradient-to-r from-black to-gray-700 text-white text-xs rounded-md flex items-center justify-between shadow-sm">
                        <span className="flex items-center gap-1">
                          <span className="text-xs">🎵</span> TikTok
                        </span>
                        <span className="bg-white text-gray-600 rounded-full text-xs w-4 h-4 flex items-center justify-center">✓</span>
                      </div>
                    </div>
                    
                    {/* Middle and right columns - Mentions feed */}
                    <div className="col-span-2 space-y-2 overflow-auto max-h-[calc(100%-30px)]">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-medium text-gray-700">Recent Mentions</div>
                        <div className="flex gap-1">
                          <div className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-sm flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>Positive</span>
                          </div>
                          <div className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-sm flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <span>Neutral</span>
                          </div>
                          <div className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-sm flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span>Negative</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Social mentions - Instagram */}
                      <div className="bg-white rounded-lg p-2 shadow-sm border-l-4 border-pink-500">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs">IG</div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-700">@fashion_lover22</span>
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                            <div className="px-1.5 py-0.5 bg-pink-100 text-pink-800 text-xs rounded">Mentioned You</div>
                          </div>
                          <span className="text-xs text-gray-500">3m ago</span>
                        </div>
                        <p className="text-xs text-gray-700 pl-7">Obsessed with @yourbrand&apos;s new collection! 😍 The designs are next level! #fashionfinds #musthave</p>
                        <div className="flex items-center gap-2 mt-1 pl-7">
                          <button className="bg-pink-100 hover:bg-pink-200 text-pink-700 text-xs px-2 py-0.5 rounded transition-colors">Reply</button>
                          <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded transition-colors">DM</button>
                          <span className="text-xs text-gray-500">💗 234 likes • 🔄 18 reposts</span>
                        </div>
                      </div>
                      
                      {/* Social mentions - Twitter/X */}
                      <div className="bg-white rounded-lg p-2 shadow-sm border-l-4 border-sky-500">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center text-white text-xs">X</div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-700">@tech_reviewer</span>
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            </div>
                            <div className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Hashtag</div>
                          </div>
                          <span className="text-xs text-gray-500">12m ago</span>
                        </div>
                        <p className="text-xs text-gray-700 pl-7">Testing the new #YourProduct today. Interface is clean but load times could be faster. Overall promising! @yourbrand</p>
                        <div className="flex items-center gap-2 mt-1 pl-7">
                          <button className="bg-sky-100 hover:bg-sky-200 text-sky-700 text-xs px-2 py-0.5 rounded transition-colors">Reply</button>
                          <span className="text-xs text-gray-500">🔄 12 reposts • 💬 8 comments</span>
                        </div>
                      </div>
                      
                      {/* Social mentions - TikTok */}
                      <div className="bg-white rounded-lg p-2 shadow-sm border-l-4 border-gray-800">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center text-white text-xs">TT</div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-700">@viral_creator</span>
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                            <div className="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded">Trending</div>
                          </div>
                          <span className="text-xs text-gray-500">28m ago</span>
                        </div>
                        <p className="text-xs text-gray-700 pl-7">This @yourbrand hack is going viral! 🔥 #lifehacks #trending #yourbrand</p>
                        <div className="flex items-center gap-2 mt-1 pl-7">
                          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded transition-colors">Reply</button>
                          <span className="text-xs text-gray-500">❤️ 14.3k • 👁️ 238k views</span>
                        </div>
                      </div>
                      
                      {/* Social mentions - YouTube */}
                      <div className="bg-white rounded-lg p-2 shadow-sm border-l-4 border-red-500">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-xs">YT</div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-700">@review_channel</span>
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            </div>
                            <div className="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded">Alert</div>
                          </div>
                          <span className="text-xs text-gray-500">1h ago</span>
                        </div>
                        <p className="text-xs text-gray-700 pl-7">Honest review of @yourbrand: The customer service needs improvement. Products are good but support is lacking.</p>
                        <div className="flex items-center gap-2 mt-1 pl-7">
                          <button className="bg-red-100 hover:bg-red-200 text-red-700 text-xs px-2 py-0.5 rounded transition-colors">Priority Reply</button>
                          <span className="text-xs text-gray-500">👁️ 2.4k views • Growing 📈</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats summary and insights */}
                  <div className="absolute bottom-2 left-2 right-2 bg-white rounded-md py-1.5 px-2 shadow-sm border border-pink-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-xs font-bold text-pink-600">+42</div>
                          <div className="text-xs text-gray-500">Mentions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-bold text-green-600">76%</div>
                          <div className="text-xs text-gray-500">Positive</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-bold text-blue-600">8.7k</div>
                          <div className="text-xs text-gray-500">Reach</div>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 max-w-[120px]">
                        <span className="font-medium">Insight:</span> Respond to @review_channel&apos;s comment soon to improve sentiment
                      </div>
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
                <p className="text-lg font-bold mb-6" style={{ color: '#17633A' }}>
                  Keep on top of what people are saying about you on online.
                </p>
                <motion.ul 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={socialInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  {[
                    'Real-time sentiment analysis and alerts.',
                    'Hashtag and keyword tracking across platforms.',
                    '@ mention identification and notifications.',
                    'Automated threat and opportunity detection.'
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
              <p className="text-lg font-bold mb-6" style={{ color: '#17633A' }}>
                Get actionable insights with comprehensive reporting and analytics derived from your data
              </p>
              <motion.ul 
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={analyticsInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                {[
                  'Performance metrics.',
                  'Sentiment trend analysis.',
                  'AI suggestion to increase reach and engagement.'
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
              {/* Enhanced Analytics Dashboard UI Mockup */}
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-green-50 rounded-lg p-4 relative overflow-hidden border border-green-200 shadow-lg">
                {/* Header with logo and controls */}
                <div className="flex items-center justify-between mb-3 border-b border-green-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-600 rounded-md w-6 h-6 flex items-center justify-center text-white font-bold text-xs">R</div>
                    <h4 className="text-sm font-semibold text-gray-800">Repruv Analytics</h4>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <select className="appearance-none bg-green-600 text-white text-xs rounded px-2.5 py-1 pr-6 cursor-pointer">
                        <option>This Month</option>
                      </select>
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-xs pointer-events-none">▼</div>
                    </div>
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded transition-colors flex items-center gap-1">
                      <span className="text-xs">📄</span> Export
                    </button>
                    <div className="bg-green-500 hover:bg-green-600 transition-colors rounded-full w-5 h-5 flex items-center justify-center cursor-pointer">
                      <span className="text-white text-xs">⚙️</span>
                    </div>
                  </div>
                </div>
                
                {/* Key performance metrics */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="bg-white rounded-md p-2 shadow-sm border border-green-100">
                    <div className="text-xs text-gray-600 mb-0.5">Engagement Rate</div>
                    <div className="text-base font-bold text-green-700">8.4%</div>
                    <div className="flex items-center text-xs text-green-600">
                      <span className="text-xs">↗</span> +1.2%
                    </div>
                  </div>
                  <div className="bg-white rounded-md p-2 shadow-sm border border-green-100">
                    <div className="text-xs text-gray-600 mb-0.5">Comments</div>
                    <div className="text-base font-bold text-gray-800">1,824</div>
                    <div className="flex items-center text-xs text-green-600">
                      <span className="text-xs">↗</span> +18%
                    </div>
                  </div>
                  <div className="bg-white rounded-md p-2 shadow-sm border border-green-100">
                    <div className="text-xs text-gray-600 mb-0.5">Response Rate</div>
                    <div className="text-base font-bold text-gray-800">97%</div>
                    <div className="flex items-center text-xs text-green-600">
                      <span className="text-xs">↗</span> +3%
                    </div>
                  </div>
                  <div className="bg-white rounded-md p-2 shadow-sm border border-green-100">
                    <div className="text-xs text-gray-600 mb-0.5">Sentiment</div>
                    <div className="text-base font-bold text-gray-800">4.8/5</div>
                    <div className="flex items-center text-xs text-green-600">
                      <span className="text-xs">↗</span> +0.3
                    </div>
                  </div>
                </div>
                
                {/* Community Health Trend Chart */}
                <div className="bg-white rounded-md p-2 border border-green-100 shadow-sm mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-gray-700">Community Engagement Trend</div>
                    <div className="flex gap-1.5">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-600">Comments</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-xs text-gray-600">Replies</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative h-24 mb-1">
                    {/* Chart grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[0, 1, 2, 3].map((_, i) => (
                        <div key={i} className="w-full h-px bg-gray-100"></div>
                      ))}
                    </div>
                    
                    {/* Chart line - Comments */}
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                      <polyline 
                        points="0,60 30,50 60,55 90,40 120,42 150,30 180,25 210,20 240,15 270,18 300,12 330,8" 
                        fill="none" 
                        stroke="#10B981" 
                        strokeWidth="2"
                        className="drop-shadow"
                      />
                      {/* Add subtle dots at data points */}
                      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((x, i) => {
                        const y = [60, 50, 55, 40, 42, 30, 25, 20, 15, 18, 12, 8][i];
                        return (
                          <circle key={i} cx={x} cy={y} r="3" fill="#10B981" />
                        );
                      })}
                    </svg>
                    
                    {/* Chart line - Replies */}
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                      <polyline 
                        points="0,80 30,75 60,72 90,68 120,65 150,60 180,55 210,50 240,48 270,45 300,40 330,38" 
                        fill="none" 
                        stroke="#3B82F6" 
                        strokeWidth="2"
                        className="drop-shadow"
                      />
                      {/* Add subtle dots at data points */}
                      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((x, i) => {
                        const y = [80, 75, 72, 68, 65, 60, 55, 50, 48, 45, 40, 38][i];
                        return (
                          <circle key={i} cx={x} cy={y} r="2" fill="#3B82F6" />
                        );
                      })}
                    </svg>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 px-1">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                    <span>Sep</span>
                    <span>Oct</span>
                    <span>Nov</span>
                    <span>Dec</span>
                  </div>
                </div>
                
                {/* Bottom section - split into engagement sources and AI insights */}
                <div className="grid grid-cols-2 gap-2 mb-1">
                  {/* Platform engagement distribution */}
                  <div className="bg-white rounded-md p-2 border border-green-100 shadow-sm">
                    <div className="text-xs font-medium text-gray-700 mb-1.5">Engagement Sources</div>
                    <div className="flex items-center mb-1.5">
                      {/* Mini donut chart */}
                      <div className="relative w-12 h-12 mr-2">
                        <svg viewBox="0 0 36 36" className="w-full h-full">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF4444" strokeWidth="3" strokeDasharray="40, 100" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3B82F6" strokeWidth="3" strokeDasharray="25, 100" strokeDashoffset="-40" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeDasharray="20, 100" strokeDashoffset="-65" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="15, 100" strokeDashoffset="-85" />
                        </svg>
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-xs text-gray-700">YouTube</span>
                          </div>
                          <span className="text-xs font-medium text-gray-700">40%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs text-gray-700">Instagram</span>
                          </div>
                          <span className="text-xs font-medium text-gray-700">25%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <span className="text-xs text-gray-700">TikTok</span>
                          </div>
                          <span className="text-xs font-medium text-gray-700">20%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs text-gray-700">Others</span>
                          </div>
                          <span className="text-xs font-medium text-gray-700">15%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Insights */}
                  <div className="bg-white rounded-md p-2 border border-green-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-xs font-medium text-gray-700">AI Insights</div>
                      <div className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-sm flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Live</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs text-gray-700 flex items-start gap-1">
                        <span className="text-green-600 text-xs mt-0.5">💡</span>
                        <span>Engagement spikes on <span className="font-medium">Thursdays</span> - consider posting then</span>
                      </div>
                      <div className="text-xs text-gray-700 flex items-start gap-1">
                        <span className="text-blue-600 text-xs mt-0.5">🎯</span>
                        <span><span className="font-medium">Hashtag #YourContent</span> gets 3x more engagement</span>
                      </div>
                      <div className="text-xs text-gray-700 flex items-start gap-1">
                        <span className="text-purple-600 text-xs mt-0.5">🚀</span>
                        <span>Your <span className="font-medium">reply rate is 26% higher</span> than similar accounts</span>
                      </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full bg-green-50 opacity-70 flex items-center justify-center">
                      <div className="w-6 h-6 text-green-500 flex items-center justify-center">🧠</div>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <button className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition-colors flex items-center gap-1">
                      <span>📊</span> Full Report
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors flex items-center gap-1">
                      <span>⚡</span> Optimize
                    </button>
                  </div>
                  <div className="bg-green-50 border border-green-300 rounded-md px-2 py-1">
                    <div className="text-xs text-green-700 flex items-center gap-1">
                      <span className="text-xs">📈</span> Performance Score: <span className="font-bold">92/100</span>
                    </div>
                  </div>
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
                {/* AI Chatbot Enhanced UI Mockup */}
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-purple-50 rounded-lg p-4 relative overflow-hidden border border-purple-200 shadow-lg">
                  {/* Header with logo and controls */}
                  <div className="flex items-center justify-between mb-3 border-b border-purple-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-purple-600 rounded-md w-6 h-6 flex items-center justify-center text-white font-bold text-xs">R</div>
                      <h4 className="text-sm font-semibold text-gray-800">Repruv AI Assistant</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-full border border-purple-200">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-purple-700">Learning Mode</span>
                      </div>
                      <div className="bg-purple-500 hover:bg-purple-600 transition-colors rounded-full w-5 h-5 flex items-center justify-center cursor-pointer">
                        <span className="text-white text-xs">⚙️</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat interface */}
                  <div className="bg-white rounded-md border border-purple-100 shadow-sm mb-2 p-2 h-[calc(100%-110px)] overflow-auto">
                    <div className="space-y-3">
                      {/* AI Welcome Message */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white text-xs font-bold">AI</div>
                        <div className="flex-1 bg-purple-50 rounded-lg p-2 max-w-[85%]">
                          <p className="text-xs text-gray-800">👋 Hello! I&apos;m your Repruv AI assistant. I can help with content strategy, analyze your audience data, answer questions about your performance, and more. How can I assist you today?</p>
                        </div>
                      </div>
                      
                      {/* User Query about Content Performance */}
                      <div className="flex items-start gap-2 justify-end">
                        <div className="flex-1 bg-gray-100 rounded-lg p-2 max-w-[85%] ml-auto">
                          <p className="text-xs text-gray-800">What was my most popular video last month?</p>
                        </div>
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">U</div>
                      </div>
                      
                      {/* AI Response with Data */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white text-xs font-bold">AI</div>
                        <div className="flex-1 bg-purple-50 rounded-lg p-2 max-w-[85%]">
                          <p className="text-xs text-gray-800 mb-2">📊 Based on your analytics, your most popular video from last month was <span className="font-medium">&quot;10 Tips for Better Engagement&quot;</span> with:</p>
                          <div className="bg-white rounded-md p-1.5 border border-purple-100 mb-2">
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-purple-600">👁️</span>
                                <span className="text-gray-700">Views: <span className="font-medium">24,382</span></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-red-600">❤️</span>
                                <span className="text-gray-700">Likes: <span className="font-medium">3,721</span></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-green-600">💬</span>
                                <span className="text-gray-700">Comments: <span className="font-medium">487</span></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-blue-600">↪️</span>
                                <span className="text-gray-700">Shares: <span className="font-medium">219</span></span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-800">Would you like me to analyze why this video performed so well?</p>
                        </div>
                      </div>
                      
                      {/* User Follow-up Question */}
                      <div className="flex items-start gap-2 justify-end">
                        <div className="flex-1 bg-gray-100 rounded-lg p-2 max-w-[85%] ml-auto">
                          <p className="text-xs text-gray-800">Yes, please analyze it and suggest how I can create more successful videos like this one.</p>
                        </div>
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">U</div>
                      </div>
                      
                      {/* AI Analysis Response */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white text-xs font-bold">AI</div>
                        <div className="flex-1 bg-purple-50 rounded-lg p-2 max-w-[85%]">
                          <p className="text-xs text-gray-800 mb-2">🧠 <span className="font-medium">Analysis of your successful video:</span></p>
                          <div className="space-y-1.5 mb-2">
                            <div className="flex items-start gap-1.5">
                              <span className="text-purple-600 text-xs">1️⃣</span>
                              <p className="text-xs text-gray-700"><span className="font-medium">Timing:</span> Posted on Thursday at 6pm - your audience&apos;s peak engagement time</p>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-purple-600 text-xs">2️⃣</span>
                              <p className="text-xs text-gray-700"><span className="font-medium">Content Format:</span> Actionable tips in a list format received 40% higher engagement</p>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-purple-600 text-xs">3️⃣</span>
                              <p className="text-xs text-gray-700"><span className="font-medium">Topic:</span> Engagement strategies align with your audience&apos;s primary interest</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-md p-2 border border-purple-200">
                            <p className="text-xs text-gray-800 font-medium mb-1">📝 Recommendations for future videos:</p>
                            <ul className="text-xs text-gray-700 space-y-1">
                              <li>• Create more list-based actionable content</li>
                              <li>• Post on Thursdays between 5-7pm</li>
                              <li>• Use similar thumbnails with high-contrast text</li>
                              <li>• Focus on engagement and growth topics</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      {/* User Request for Monetization Help */}
                      <div className="flex items-start gap-2 justify-end">
                        <div className="flex-1 bg-gray-100 rounded-lg p-2 max-w-[85%] ml-auto">
                          <p className="text-xs text-gray-800">Can you suggest some ways I could monetize my content better?</p>
                        </div>
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">U</div>
                      </div>
                      
                      {/* AI typing indicator */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white text-xs font-bold">AI</div>
                        <div className="flex-1 bg-purple-50 rounded-lg p-3 max-w-[85%]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Input area */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-white rounded-lg border border-purple-200 p-2 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            className="w-full text-xs px-3 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                            placeholder="Ask me anything about your content and audience..."
                            value=""
                            readOnly
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                              <span className="text-xs text-gray-500">📎</span>
                            </div>
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                              <span className="text-xs text-gray-500">🎤</span>
                            </div>
                          </div>
                        </div>
                        <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-xs flex items-center gap-1 transition-colors">
                          <span>Send</span>
                          <span className="text-xs">➤</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 px-1">
                        <div className="text-xs text-gray-500">Powered by Repruv AI</div>
                        <div className="flex items-center gap-2">
                          <button className="text-xs text-purple-600 hover:underline">Clear conversation</button>
                          <button className="text-xs text-purple-600 hover:underline flex items-center gap-0.5">
                            <span>🔒</span> Privacy
                          </button>
                        </div>
                      </div>
                    </div>
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
                  <h2 className="text-3xl font-bold brand-text">AI Chatbot</h2>
                </div>
                <p className="text-lg font-bold mb-6" style={{ color: '#17633A' }}>
                  AI Chatbot that understands you and your community.
                </p>
                <motion.ul 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={aiInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  {[
                    'Works like any AI, you can ask it anything.',
                    'Answers questions about your content, such as "What was my most popular reel last month?"',
                    'Assists you in the creative process.',
                    'Helps you to monetise your online presence.'
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