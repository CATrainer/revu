'use client';

import Rect, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  FaMagic, 
  FaLightbulb,
  FaClipboardList,
  FaSearch,
  FaFileAlt,
  FaVideo,
  FaEdit,
  FaCog,
  FaShare,
  FaComment,
  FaAd,
  FaChartBar,
  FaChartLine,
  FaBullhorn,
  FaRecycle,
  FaHashtag,
  FaGlobe,
  FaReply,
  FaUsers,
  FaCheck
} from 'react-icons/fa';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function AIPage() {
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    // Small delay to ensure smooth initial animation
    const timer = setTimeout(() => {
      setPageLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`py-16 section-background transition-all duration-1000 ${
      pageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      {/* Repruv Content Creation Framework with Snake Animation */}
      <ContentCreationFramework />
    </div>
  );
}

function Hero() {
  return null; // Remove the hero section entirely since we're moving content up
}



// The Repruv Content Creation Framework Component with Snake Animation
function ContentCreationFramework() {

  const [isClient, setIsClient] = useState(false);
  const [isFrameworkVisible, setIsFrameworkVisible] = useState(false);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const frameworkRef = useRef(null);
  
  // Ensure this only runs on client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Intersection observer for framework animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsFrameworkVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (frameworkRef.current) {
      observer.observe(frameworkRef.current);
    } else {
      // Fallback - show animation after a delay if ref is not available
      const timer = setTimeout(() => {
        setIsFrameworkVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    return () => observer.disconnect();
  }, []);

  // Force animation to show after component mounts
  useEffect(() => {
    const forceShowTimer = setTimeout(() => {
      setIsFrameworkVisible(true);
    }, 2000);

    return () => clearTimeout(forceShowTimer);
  }, []);
  
  // Framework stages data with icons and AI-focused descriptions
  const stages = [
    { 
      id: 1, 
      title: "Inspiration", 
      description: "Repruv AI analyzes trends, identifies content gaps, and provides creative insights",
      features: [
        "Trend analysis & forecasting",
        "Content gap identification", 
        "Creative concept generation",
        "Viral content pattern insights"
      ],
      aiHelp: "Trend analysis, audience research insights, competitor gap identification, viral content patterns",
      icon: <FaLightbulb className="w-6 h-6" />,
      category: "Planning"
    },
    { 
      id: 2, 
      title: "Strategy", 
      description: "Repruv AI generates strategic recommendations and content calendar insights",
      features: [
        "Content pillar optimization",
        "Optimal posting schedule",
        "Audience targeting insights",
        "Performance predictions"
      ],
      aiHelp: "Content pillar suggestions, optimal posting schedules, audience targeting insights, performance predictions",
      icon: <FaClipboardList className="w-6 h-6" />,
      category: "Planning"
    },
    { 
      id: 3, 
      title: "Research", 
      description: "Repruv AI provides comprehensive research insights and topic analysis",
      features: [
        "Automated topic research",
        "Key point extraction",
        "Audience question analysis",
        "SEO keyword insights"
      ],
      aiHelp: "Topic research summaries, key point extraction, audience questions analysis, SEO insights",
      icon: <FaSearch className="w-6 h-6" />,
      category: "Planning"
    },
    { 
      id: 4, 
      title: "Pre-production", 
      description: "Repruv AI offers planning insights and workflow optimization recommendations",
      features: [
        "Planning checklists",
        "Resource allocation insights",
        "Timeline optimization",
        "Workflow recommendations"
      ],
      aiHelp: "Planning checklists, resource allocation insights, timeline optimization, collaboration tips",
      icon: <FaFileAlt className="w-6 h-6" />,
      category: "Creation"
    },
    { 
      id: 5, 
      title: "Production", 
      description: "Repruv AI provides production insights and quality improvement recommendations",
      features: [
        "Quality assessment insights",
        "Composition feedback",
        "Pacing recommendations",
        "B-roll suggestions"
      ],
      aiHelp: "Quality assessment insights, composition feedback, pacing recommendations, B-roll suggestions",
      icon: <FaVideo className="w-6 h-6" />,
      category: "Creation"
    },
    { 
      id: 6, 
      title: "Editing", 
      description: "Repruv AI analyzes content and suggests editing improvements and optimizations",
      features: [
        "Engagement optimization",
        "Pacing analysis",
        "Highlight identification",
        "Cut suggestions"
      ],
      aiHelp: "Engagement optimization insights, pacing analysis, highlight identification, improvement suggestions",
      icon: <FaEdit className="w-6 h-6" />,
      category: "Creation"
    },
    { 
      id: 7, 
      title: "Optimization", 
      description: "Repruv AI analyzes and recommends metadata, SEO, and platform optimizations",
      features: [
        "SEO recommendations",
        "Metadata optimization",
        "Hashtag analysis",
        "Platform-specific tips"
      ],
      aiHelp: "SEO recommendations, metadata insights, hashtag analysis, platform-specific optimization tips",
      icon: <FaCog className="w-6 h-6" />,
      category: "Distribution"
    },
    { 
      id: 8, 
      title: "Distribution", 
      description: "Repruv AI provides timing insights and multi-platform distribution analysis",
      features: [
        "Optimal timing analysis",
        "Platform performance insights",
        "Audience activity patterns",
        "Reach predictions"
      ],
      aiHelp: "Optimal timing analysis, platform performance insights, audience activity patterns, reach predictions",
      icon: <FaShare className="w-6 h-6" />,
      category: "Distribution"
    },
    { 
      id: 9, 
      title: "Engagement", 
      description: "Repruv AI analyzes engagement patterns and provides community insights",
      features: [
        "Engagement pattern analysis",
        "Sentiment insights",
        "Response suggestions",
        "Community growth tracking"
      ],
      aiHelp: "Engagement analysis, sentiment insights, response suggestions, community growth patterns",
      icon: <FaComment className="w-6 h-6" />,
      category: "Distribution"
    },
    { 
      id: 10, 
      title: "Promotion", 
      description: "Repruv AI provides advertising insights and audience targeting recommendations",
      features: [
        "Audience segmentation",
        "Ad performance analysis",
        "Budget optimization",
        "Targeting recommendations"
      ],
      aiHelp: "Audience segmentation insights, ad performance analysis, budget optimization recommendations, targeting suggestions",
      icon: <FaAd className="w-6 h-6" />,
      category: "Analysis"
    },
    { 
      id: 11, 
      title: "Analytics", 
      description: "Repruv AI delivers comprehensive performance insights and growth recommendations",
      features: [
        "Performance analysis",
        "Growth insights",
        "Success pattern identification",
        "Improvement recommendations"
      ],
      aiHelp: "Performance analysis, growth insights, success pattern identification, improvement recommendations",
      icon: <FaChartBar className="w-6 h-6" />,
      category: "Analysis"
    },
    { 
      id: 12, 
      title: "Repurposing", 
      description: "Repruv AI identifies repurposing opportunities and content lifecycle insights",
      features: [
        "Content repurposing insights",
        "Format adaptation suggestions",
        "Evergreen content identification",
        "Lifecycle analysis"
      ],
      aiHelp: "Content repurposing insights, format adaptation recommendations, evergreen content identification, lifecycle analysis",
      icon: <FaRecycle className="w-6 h-6" />,
      category: "Analysis"
    }
  ];
  


  // Define framework sections for visual grouping - updated colors
  const frameworkSections = [
    { 
      title: "Planning", 
      stages: [1, 2, 3],
      color: "#3b82f6", // Blue
      gradientFrom: "#3b82f6",
      gradientTo: "#1d4ed8"
    },
    { 
      title: "Creation", 
      stages: [4, 5, 6],
      color: "#10b981", // Green
      gradientFrom: "#10b981",
      gradientTo: "#059669"
    },
    { 
      title: "Distribution", 
      stages: [7, 8, 9],
      color: "#f59e0b", // Orange
      gradientFrom: "#f59e0b",
      gradientTo: "#d97706"
    },
    { 
      title: "Analysis", 
      stages: [10, 11, 12],
      color: "#8b5cf6", // Purple
      gradientFrom: "#8b5cf6",
      gradientTo: "#7c3aed"
    }
  ];

  // Snake path calculation for modern flowing layout
  const getSnakePosition = (index: number) => {
    const containerWidth = 1100;
    const containerHeight = 950;
    const padding = 80;
    const verticalSpacing = 280;
    
    // Create a proper snake pattern with 4 stages per row for better visual flow
    const stagesPerRow = 4;
    const row = Math.floor(index / stagesPerRow);
    const col = index % stagesPerRow;
    
    // Create snake pattern - alternate direction each row
    const actualCol = row % 2 === 0 ? col : stagesPerRow - 1 - col;
    
    // Calculate position with proper spacing
    const availableWidth = containerWidth - 2 * padding;
    const stageSpacing = availableWidth / (stagesPerRow - 1);
    const x = padding + actualCol * stageSpacing;
    const y = padding + row * verticalSpacing;
    
    return { x, y };
  };

  // Function to get perfect perimeter-to-perimeter connection points
  const getConnectionPoint = (fromIndex: number, toIndex: number) => {
    const fromPos = getSnakePosition(fromIndex);
    const toPos = getSnakePosition(toIndex);
    
    // Updated box dimensions (w-60 = 240px, h-48 = 192px)
    // Cards are positioned with: left: position.x - 120px, top: position.y - 96px
    // So the actual box boundaries are:
    // Left edge: position.x - 120, Right edge: position.x - 120 + 240 = position.x + 120
    // Top edge: position.y - 96, Bottom edge: position.y - 96 + 192 = position.y + 96
    
    const deltaX = toPos.x - fromPos.x;
    const deltaY = toPos.y - fromPos.y;
    
    let fromPoint, toPoint;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal connection - connect left/right borders perfectly
      if (deltaX > 0) {
        // Moving right: right border of from-box to left border of to-box
        fromPoint = { x: fromPos.x + 120, y: fromPos.y }; // Right edge of from-box
        toPoint = { x: toPos.x - 120, y: toPos.y }; // Left edge of to-box
      } else {
        // Moving left: left border of from-box to right border of to-box
        fromPoint = { x: fromPos.x - 120, y: fromPos.y }; // Left edge of from-box
        toPoint = { x: toPos.x + 120, y: toPos.y }; // Right edge of to-box
      }
    } else {
      // Vertical connection - connect top/bottom borders perfectly
      if (deltaY > 0) {
        // Moving down: bottom border of from-box to top border of to-box
        fromPoint = { x: fromPos.x, y: fromPos.y + 96 }; // Bottom edge of from-box
        toPoint = { x: toPos.x, y: toPos.y - 96 }; // Top edge of to-box
      } else {
        // Moving up: top border of from-box to bottom border of to-box
        fromPoint = { x: fromPos.x, y: fromPos.y - 96 }; // Top edge of from-box
        toPoint = { x: toPos.x, y: toPos.y + 96 }; // Bottom edge of to-box
      }
    }
    
    return { from: fromPoint, to: toPoint };
  };

  // Get stage section color
  const getStageSection = (stageId: number) => {
    return frameworkSections.find(section => section.stages.includes(stageId)) || frameworkSections[0];
  };

  // Selected stage data


  // Prevent SSR issues
  if (!isClient) {
    return (
      <section className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-pulse text-2xl font-bold text-green-600">Loading Repruv AI Framework...</div>
      </section>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(50px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pathDraw {
          from {
            stroke-dashoffset: 100;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
      <section className="py-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={frameworkRef}
          className={`text-center mb-12 transition-all duration-1000 ${
            isFrameworkVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Repruv AI Empowers You To <span className="text-purple-600 dark:text-purple-400">Engage.</span> <span className="text-blue-600 dark:text-blue-400">Grow.</span> <span className="text-green-600 dark:text-green-400">Monetise.</span>
          </h1>
          <p className="text-xl md:text-2xl text-green-600 dark:text-green-400 max-w-4xl mx-auto leading-relaxed font-medium">
            Our AI-powered 12 stage framework guides you through every step of your creative journey.
          </p>
        </div>

        {/* 12 Stages Overview - Aligned with snake layout */}
        <div 
          className={`mb-12 mx-auto transition-all duration-1000 ${
            isFrameworkVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ 
            width: '1100px', 
            maxWidth: '100%',
            transitionDelay: isFrameworkVisible ? '400ms' : '0ms' 
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {frameworkSections.map((section, sectionIndex) => {
              // Contextually relevant graphics for each section
              const sectionGraphics = {
                'Planning': <FaLightbulb className="h-12 w-12" />,
                'Creation': <FaEdit className="h-12 w-12" />,
                'Distribution': <FaShare className="h-12 w-12" />,
                'Analysis': <FaChartBar className="h-12 w-12" />
              };
              
              return (
                <div 
                  key={section.title}
                  className="relative text-center p-8 rounded-2xl border border-transparent transition-all duration-500 hover:scale-105 hover:shadow-2xl group overflow-hidden"
                  style={{ 
                    background: `linear-gradient(135deg, ${section.gradientFrom}08, ${section.gradientTo}15)`,
                    backdropFilter: 'blur(10px)',
                    boxShadow: `0 8px 32px ${section.color}15`
                  }}
                >
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                    <div className="absolute top-4 right-4 w-16 h-16 rounded-full" style={{ backgroundColor: section.color }} />
                    <div className="absolute bottom-6 left-6 w-8 h-8 rounded-full" style={{ backgroundColor: section.color }} />
                    <div className="absolute top-1/2 left-8 w-4 h-4 rounded-full" style={{ backgroundColor: section.color }} />
                  </div>
                  
                  {/* Main graphic icon */}
                  <div 
                    className="flex justify-center mb-6 text-current transform group-hover:scale-110 transition-transform duration-500"
                    style={{ color: section.color }}
                  >
                    {sectionGraphics[section.title as keyof typeof sectionGraphics]}
                  </div>
                  
                  {/* Section title */}
                  <h3 
                    className="font-bold text-2xl mb-4 group-hover:text-opacity-90 transition-all duration-300"
                    style={{ color: section.color }}
                  >
                    {section.title}
                  </h3>
                  
                  {/* Stage numbers with sleek design */}
                  <div className="flex justify-center gap-3 mb-4">
                    {section.stages.map((stageId, idx) => (
                      <div
                        key={stageId}
                        className="relative w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg transform group-hover:scale-110 transition-all duration-300"
                        style={{ 
                          backgroundColor: section.color,
                          transitionDelay: `${idx * 50}ms`
                        }}
                      >
                        <div 
                          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                          style={{ backgroundColor: 'white' }}
                        />
                        {stageId}
                      </div>
                    ))}
                  </div>
                  
                  {/* Subtle stage range indicator */}
                  <div 
                    className="inline-block px-4 py-2 rounded-full text-xs font-semibold text-white/90 backdrop-blur-sm"
                    style={{ backgroundColor: `${section.color}60` }}
                  >
                    Stages {section.stages[0]}-{section.stages[section.stages.length - 1]}
                  </div>
                  
                  {/* Sleek border gradient effect */}
                  <div 
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ 
                      background: `linear-gradient(135deg, ${section.color}20, transparent 50%, ${section.color}10)`,
                      border: `1px solid ${section.color}30`
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Snake Animation Container - Expanded for larger boxes */}
        <div className="relative mx-auto" style={{ width: '1100px', height: '950px', minHeight: '950px' }}>
          {/* Animated connection lines (SVG Path) */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 1100 950"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              <linearGradient id="snakeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                <stop offset="25%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
                <stop offset="75%" stopColor="#8b5cf6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
              </linearGradient>
              
              {/* Section-specific gradients for snake path */}
              <linearGradient id="planningGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="creationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="distributionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="analysisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8" />
              </linearGradient>
              
              {/* Single appealing gradient for the snake */}
              <linearGradient id="multiSectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#1e40af" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            
            {/* Complete continuous snake path connecting ALL stages */}
            {/* Connecting lines between all stages */}
            {stages.slice(0, -1).map((stage, index) => {
              const connection = getConnectionPoint(index, index + 1);
              const fromPoint = connection.from;
              const toPoint = connection.to;
              
              return (
                <g key={`connection-${index}`}>
                  {/* Main connecting line */}
                  <path
                    d={`M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`}
                    stroke="#3b82f6"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  {/* Optional: Add arrow indicator */}
                  <circle
                    cx={toPoint.x}
                    cy={toPoint.y}
                    r="3"
                    fill="#3b82f6"
                    opacity="0.6"
                  />
                </g>
              );
            })}
          </svg>

          {/* Stage Cards arranged in snake pattern */}
          <div className="relative w-full h-full">
            {stages.map((stage, index) => {
              const position = getSnakePosition(index);
              const section = getStageSection(stage.id);
              const isHovered = hoveredStage === stage.id;
              
              return (
                <div
                  key={stage.id}
                  className={`absolute transition-all duration-700 transform-gpu opacity-100 translate-y-0 scale-100 ${
                    isHovered ? 'z-50' : 'z-20'
                  }`}
                  style={{
                    left: `${position.x - 120}px`,
                    top: `${position.y - 96}px`,
                    transform: `translate3d(0, 0, 0) ${isHovered ? 'scale(1.05)' : 'scale(1)'}`,
                    filter: isHovered ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' : 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))',
                    animation: `slideIn 0.8s ease-out ${index * 0.1}s both`
                  }}
                  onMouseEnter={() => setHoveredStage(stage.id)}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  {/* Stage Card - Expanded for tick features */}
                  <div 
                    className="relative w-60 h-48 rounded-2xl p-4 border-2 transition-all duration-300 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${section.gradientFrom}15, ${section.gradientTo}25)`,
                      borderColor: isHovered ? section.color : `${section.color}40`,
                      boxShadow: isHovered 
                        ? `0 8px 25px ${section.color}30` 
                        : `0 4px 15px rgba(0,0,0,0.1)`
                    }}
                  >
                    {/* Stage Number Badge */}
                    <div 
                      className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg transform transition-all duration-300"
                      style={{ 
                        backgroundColor: section.color,
                        transform: isHovered ? 'scale(1.2) rotate(15deg)' : 'scale(1) rotate(0deg)'
                      }}
                    >
                      {stage.id}
                    </div>

                    {/* Category Tag */}
                    <div 
                      className="absolute -top-2 left-4 px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                      style={{ backgroundColor: `${section.color}90` }}
                    >
                      {stage.category}
                    </div>

                    {/* Stage Icon */}
                    <div 
                      className="flex items-center justify-center w-12 h-12 rounded-xl mb-2 transition-all duration-300"
                      style={{ 
                        backgroundColor: `${section.color}20`,
                        color: section.color,
                        transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)'
                      }}
                    >
                      {stage.icon}
                    </div>

                    {/* Stage Title - Always visible */}
                    <h3 
                      className="font-bold text-sm mb-2 transition-all duration-300 text-center line-clamp-2"
                      style={{ 
                        color: section.color,
                        textShadow: isHovered ? '0 0 8px rgba(255,255,255,0.8)' : 'none'
                      }}
                    >
                      {stage.title}
                    </h3>
                    
                    {/* AI Features - Tick boxes */}
                    <div className="space-y-1 text-left">
                      {stage.features?.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <FaCheck 
                            className="h-2.5 w-2.5 text-green-500 flex-shrink-0" 
                            style={{ color: section.color }}
                          />
                          <span className="text-gray-600 dark:text-gray-400 leading-tight">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>




      </div>
    </section>
    </>
  );
}

