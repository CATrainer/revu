'use client';

import React, { useRef, useState, useEffect } from 'react';
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
  FaUsers
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
    <div className={`py-24 section-background transition-all duration-1000 ${
      pageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      {/* Repruv AI Hero */}
      <Hero />
      
      {/* AI Features Overview */}
      <AIFeatures />
      
      {/* Repruv Content Creation Framework */}
      <ContentCreationFramework />
    </div>
  );
}

function Hero() {
  const heroRef = useRef(null);

  return (
    <section 
      ref={heroRef}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center opacity-100 transition-opacity duration-800"
    >
      <h1 
        className="text-4xl md:text-5xl font-bold text-green-600 mb-6 opacity-100 translate-y-0 transition-all duration-800 delay-400"
      >
        Repruv AI Enhances Your Community Engagement
      </h1>
      <p 
        className="text-xl text-green-700 font-medium mb-8 max-w-3xl mx-auto opacity-100 translate-y-0 transition-all duration-600 delay-600"
      >
        Our AI-powered platform optimizes every stage of your content journey
      </p>
      <div 
        className="flex justify-center opacity-100 translate-y-0 transition-all duration-800 delay-800"
      >
        <Button size="lg" className="px-8 py-6 text-lg bg-green-500 hover:bg-green-400 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
          <Link href="/#hero">Get Early Access</Link>
        </Button>
      </div>
    </section>
  );
}

// AI Features Overview Section
function AIFeatures() {
  const [isVisible, setIsVisible] = useState(false);
  const featuresRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add a slight delay for dramatic effect
          setTimeout(() => setIsVisible(true), 100);
        }
      },
      { threshold: 0.15, rootMargin: '-30px 0px' }
    );

    if (featuresRef.current) {
      observer.observe(featuresRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <FaLightbulb className="h-8 w-8" />,
      title: "AI-Powered Content Planning",
      description: "Intelligent research, ideation, and strategic planning that identifies trending topics and optimizes content calendars for maximum engagement.",
      highlights: ["Trend Analysis", "Content Calendar Optimization", "Topic Research", "Audience Targeting"]
    },
    {
      icon: <FaEdit className="h-8 w-8" />,
      title: "Automated Content Creation",
      description: "Generate high-quality scripts, captions, and visual concepts with AI assistance that maintains your unique brand voice and style.",
      highlights: ["Script Generation", "Caption Writing", "Visual Concepts", "Brand Voice Consistency"]
    },
    {
      icon: <FaBullhorn className="h-8 w-8" />,
      title: "Smart Distribution & Optimization",
      description: "Optimize posting schedules, cross-platform distribution, and engagement strategies using AI-driven insights and automation.",
      highlights: ["Optimal Timing", "Cross-Platform Publishing", "Engagement Optimization", "Automated Workflows"]
    },
    {
      icon: <FaChartLine className="h-8 w-8" />,
      title: "Advanced Performance Analytics",
      description: "Comprehensive analytics with AI-powered insights that track performance, identify growth opportunities, and predict content success.",
      highlights: ["Performance Tracking", "Growth Insights", "Success Prediction", "ROI Analysis"]
    }
  ];

  return (
    <section ref={featuresRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-16">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {features.map((feature, index) => (
          <div 
            key={index}
            className={`bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-1000 hover:-translate-y-2 hover:rotate-1 ${
              isVisible 
                ? 'opacity-100 translate-y-0 scale-100 rotate-0' 
                : 'opacity-0 translate-y-24 scale-90 -rotate-3'
            }`}
            style={{ 
              transitionDelay: isVisible ? `${300 + (index * 200)}ms` : '0ms',
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              transformOrigin: 'center bottom'
            }}
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center text-green-600 transition-all duration-700 ${
                isVisible ? 'scale-100 rotate-0' : 'scale-75 rotate-45'
              }`} style={{ 
                transitionDelay: isVisible ? `${400 + (index * 200)}ms` : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
              }}>
                <div className={`transition-all duration-500 ${isVisible ? 'scale-100' : 'scale-0'}`} 
                     style={{ transitionDelay: isVisible ? `${500 + (index * 200)}ms` : '0ms' }}>
                  {feature.icon}
                </div>
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold text-gray-900 mb-3 transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`} style={{ 
                  transitionDelay: isVisible ? `${600 + (index * 200)}ms` : '0ms',
                  transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}>
                  {feature.title}
                </h3>
                <p className={`text-gray-600 mb-4 leading-relaxed transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`} style={{ 
                  transitionDelay: isVisible ? `${700 + (index * 200)}ms` : '0ms' 
                }}>
                  {feature.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {feature.highlights.map((highlight, idx) => (
                    <span 
                      key={idx}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200 transition-all duration-600 ${
                        isVisible ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-95 rotate-6'
                      }`}
                      style={{ 
                        transitionDelay: isVisible ? `${800 + (index * 200) + (idx * 100)}ms` : '0ms',
                        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`text-center mt-12 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
      }`} style={{ 
        transitionDelay: isVisible ? '800ms' : '0ms',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-6 py-3 rounded-full text-base font-medium hover:bg-blue-100 transition-colors duration-300">
          <FaCog className="h-5 w-5" />
          Fully Integrated AI Workflow Management
        </div>
      </div>
    </section>
  );
}

// The Repruv Content Creation Framework Component with circular animation
function ContentCreationFramework() {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isFrameworkVisible, setIsFrameworkVisible] = useState(true); // Start visible to ensure content shows
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
      { threshold: 0.2 }
    );

    if (frameworkRef.current) {
      observer.observe(frameworkRef.current);
    }

    return () => observer.disconnect();
  }, []);
  
  // Framework stages data with icons
  const stages = [
    { 
      id: 1, 
      title: "Inspiration", 
      description: "Trends, audience questions and idea gaps",
      icon: <FaLightbulb className="w-6 h-6" />
    },
    { 
      id: 2, 
      title: "Strategy", 
      description: "Goals, pillars and editorial calendar",
      icon: <FaClipboardList className="w-6 h-6" />
    },
    { 
      id: 3, 
      title: "Research", 
      description: "Briefs, facts and script drafts",
      icon: <FaSearch className="w-6 h-6" />
    },
    { 
      id: 4, 
      title: "Pre-production", 
      description: "Shot plans, briefs & collaborator packs",
      icon: <FaFileAlt className="w-6 h-6" />
    },
    { 
      id: 5, 
      title: "Production", 
      description: "Filming: footage, audio and B-roll",
      icon: <FaVideo className="w-6 h-6" />
    },
    { 
      id: 6, 
      title: "Editing", 
      description: "Cuts, color, sound & motion polish",
      icon: <FaEdit className="w-6 h-6" />
    },
    { 
      id: 7, 
      title: "Optimization", 
      description: "Thumbnails, metadata & localization",
      icon: <FaCog className="w-6 h-6" />
    },
    { 
      id: 8, 
      title: "Distribution", 
      description: "Scheduling & staged releases",
      icon: <FaShare className="w-6 h-6" />
    },
    { 
      id: 9, 
      title: "Engagement", 
      description: "Comments, DMs and moderation",
      icon: <FaComment className="w-6 h-6" />
    },
    { 
      id: 10, 
      title: "Promotion", 
      description: "Paid boosts, audiences & testing",
      icon: <FaAd className="w-6 h-6" />
    },
    { 
      id: 11, 
      title: "Analytics", 
      description: "Insights, KPIs & playbooks",
      icon: <FaChartBar className="w-6 h-6" />
    },
    { 
      id: 12, 
      title: "Repurposing", 
      description: "Clips, threads & evergreen plans",
      icon: <FaRecycle className="w-6 h-6" />
    }
  ];
  
  const handleStageClick = (stageId: number) => {
    setSelectedStage(stageId);
    setOpenDialog(true);
  };

  // No helper functions needed here
  
  // Increased circle size for perfect circular positioning of all 12 stages
  const circleRadius = 360;  // Adjusted for optimal spacing
  const centerSize = 160;   // Slightly reduced for better proportions
  
  // Define framework sections for visual grouping with clearer color coding
  const frameworkSections = [
    { 
      title: "Planning", 
      stages: [1, 2, 3], // Inspiration, Strategy, Research
      color: "#0ea5e9", // blue
      bgColor: "from-blue-50 to-green-50",
      darkColor: "from-blue-900/20 to-green-900/20",
      shadowText: "PLAN",
      textColor: "text-green-800 dark:text-green-300",
      iconBgColor: "bg-cyan-100 dark:bg-cyan-900/40"
    },
    { 
      title: "Creation", 
      stages: [4, 5, 6], // Pre-production, Production, Editing
      color: "#10b981", // green
      bgColor: "from-green-50 to-teal-50",
      darkColor: "from-green-900/20 to-teal-900/20",
      shadowText: "CREATE",
      textColor: "text-green-800 dark:text-green-300",
      iconBgColor: "bg-green-100 dark:bg-green-900/40"
    },
    { 
      title: "Distribution", 
      stages: [7, 8, 9], // Optimization, Distribution, Engagement
      color: "#14b8a6", // teal
      bgColor: "from-teal-50 to-cyan-50",
      darkColor: "from-teal-900/20 to-cyan-900/20",
      shadowText: "SHARE",
      textColor: "text-green-800 dark:text-green-300",
      iconBgColor: "bg-teal-100 dark:bg-teal-900/40"
    },
    { 
      title: "Analysis", 
      stages: [10, 11, 12], // Promotion, Analytics, Repurposing
      color: "#3b82f6", // blue
      bgColor: "from-cyan-50 to-blue-50",
      darkColor: "from-cyan-900/20 to-blue-900/20",
      shadowText: "ANALYZE",
      textColor: "text-green-800 dark:text-green-300",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/40"
    }
  ];

  // Selected stage data
  const selectedStageData = selectedStage ? stages.find(s => s.id === selectedStage) : null;

  // Prevent SSR issues with framer-motion
  if (!isClient) {
    return (
      <section className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-full flex flex-col items-center">
          <div className="text-center mb-8 mt-20">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-6 py-3 rounded-full text-base font-medium shadow-md border border-green-200">
              <FaRecycle className="h-5 w-5" />
              Creator Content Lifecycle
            </div>
          </div>
          <div>Loading...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center justify-center min-h-screen mb-24 pb-16">
      <div className="w-full flex flex-col items-center">
        <div
          ref={frameworkRef}
          className={`transition-all duration-1000 ${
            isFrameworkVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <div className={`text-center mb-8 mt-20 transition-all duration-800 ${
            isFrameworkVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`} style={{ transitionDelay: isFrameworkVisible ? '200ms' : '0ms' }}>
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-6 py-3 rounded-full text-base font-medium shadow-md border border-green-200">
              <FaRecycle className="h-5 w-5" />
              Creator Content Lifecycle
            </div>
          </div>
          
          {/* Circle Animation Container - Square layout with proper centering */}
        <div className="relative flex items-center justify-center mx-auto" 
             style={{ 
               width: '1000px', 
               height: '1000px',
               maxWidth: '100vw',
               maxHeight: '100vh',
               overflow: 'visible'
             }}>
          {/* Section backgrounds with clearer quadrant separation */}
          <svg 
            width="1000" 
            height="1000" 
            className={`absolute transition-all duration-1000 ${
              isFrameworkVisible ? 'opacity-100' : 'opacity-0'
            }`} 
            style={{ 
              left: '50%', 
              top: '50%', 
              transform: 'translate(-50%, -50%)',
              transitionDelay: isFrameworkVisible ? '300ms' : '0ms'
            }}
          >
            <defs>
              {/* Define gradients for each section */}
              {frameworkSections.map((section, sectionIndex) => (
                <radialGradient 
                  key={`gradient-${sectionIndex}`} 
                  id={`sectionGradient-${sectionIndex}`} 
                  cx="50%" 
                  cy="50%" 
                  r="50%" 
                  gradientUnits="objectBoundingBox"
                >
                  <stop offset="30%" stopColor="#ffffff" stopOpacity="0.02" />
                  <stop offset="70%" stopColor={section.color} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={section.color} stopOpacity="0.25" />
                </radialGradient>
              ))}
              
            </defs>
            
            {/* Draw quadrant sections */}
            {frameworkSections.map((section, sectionIndex) => {
              // Calculate angles for each quadrant (90° per section)
              const startAngle = (sectionIndex * Math.PI / 2) - (Math.PI / 2); // Start from top
              const endAngle = ((sectionIndex + 1) * Math.PI / 2) - (Math.PI / 2);
              
              // Calculate coordinates for the quadrant path
              const outerRadius = circleRadius + 180;
              const centerX = 500;
              const centerY = 500;
              
              const startX = centerX + outerRadius * Math.cos(startAngle);
              const startY = centerY + outerRadius * Math.sin(startAngle);
              const endX = centerX + outerRadius * Math.cos(endAngle);
              const endY = centerY + outerRadius * Math.sin(endAngle);
              
              // Create sector path
              const path = [
                `M ${centerX} ${centerY}`, // Move to center
                `L ${startX} ${startY}`, // Line to start point
                `A ${outerRadius} ${outerRadius} 0 0 1 ${endX} ${endY}`, // Arc to end point
                'Z' // Close path
              ].join(' ');
              
              // Calculate label position - professional angled placement
              const labelAngle = (startAngle + endAngle) / 2;
              const labelDistance = outerRadius - 40;
              const labelX = centerX + labelDistance * Math.cos(labelAngle);
              const labelY = centerY + labelDistance * Math.sin(labelAngle);
              // Angle text appropriately based on quadrant
              const labelRotation = (labelAngle * (180 / Math.PI)) + 90;
              
              return (
                <g key={`section-${sectionIndex}`}>
                  {/* Section background with gradient and rounded corners */}
                  <path
                    d={path}
                    fill={`url(#sectionGradient-${sectionIndex})`}
                    stroke="none"
                    rx="20"
                    ry="20"
                    className={`transition-all duration-1000 ${
                      isFrameworkVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ 
                      transformOrigin: `${centerX}px ${centerY}px`,
                      transform: isFrameworkVisible ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-10deg)',
                      transitionDelay: isFrameworkVisible ? `${100 + (sectionIndex * 150)}ms` : '0ms',
                      transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  />
                  
                  {/* Section title - Professional angled layout */}
                  <text
                    x={labelX}
                    y={labelY}
                    className={`font-bold text-green-800 dark:text-green-300 transition-all duration-800 ${
                      isFrameworkVisible ? 'opacity-95' : 'opacity-0'
                    }`}
                    style={{ 
                      fontSize: '22px', 
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      transform: isFrameworkVisible ? 'scale(1) rotate(0deg)' : 'scale(0.7) rotate(15deg)',
                      transformOrigin: `${labelX}px ${labelY}px`,
                      transitionDelay: isFrameworkVisible ? `${300 + (sectionIndex * 150)}ms` : '0ms',
                      transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                    }}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
                  >
                    {section.title.toUpperCase()}
                  </text>
                  
                </g>
              );
            })}
          </svg>
          
          {/* Center Circle - Clean professional design */}
          <div 
            className={`absolute rounded-full bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center z-20 hover:scale-102 transition-all duration-1200 ${
              isFrameworkVisible ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-180'
            }`}
            style={{ 
              width: `${centerSize}px`, 
              height: `${centerSize}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              transitionDelay: isFrameworkVisible ? '200ms' : '0ms',
              transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }}
          >
            {/* Inner content - NO shiny effects */}
            <div className="flex flex-col items-center justify-center text-center p-2">
              <div className={`relative mb-2 transition-all duration-800 ${
                isFrameworkVisible ? 'scale-100 rotate-0' : 'scale-0 rotate-45'
              }`} style={{ 
                transitionDelay: isFrameworkVisible ? '400ms' : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}>
                <FaMagic className="h-8 w-8 text-white" />
              </div>
              <span className={`text-white text-xl font-bold leading-tight transition-all duration-700 ${
                isFrameworkVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`} style={{ 
                transitionDelay: isFrameworkVisible ? '500ms' : '0ms' 
              }}>Repruv AI</span>
              <span className={`text-white/90 text-xs mt-1 tracking-wider uppercase font-light transition-all duration-700 ${
                isFrameworkVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`} style={{ 
                transitionDelay: isFrameworkVisible ? '600ms' : '0ms' 
              }}>Content Framework</span>
            </div>
          </div>

          {/* Orbit path indicators - one per section */}
          <svg
            className="absolute z-10 pointer-events-none"
            style={{
              width: '900px', 
              height: '900px',
              left: '50%', 
              top: '50%', 
              transform: 'translate(-50%, -50%)'
            }}
          >
          </svg>
          
          {/* Stages arranged in a perfect circle around the center */}
          {stages.map((stage) => {
            // Find which section this stage belongs to
            const sectionIndex = frameworkSections.findIndex(section => 
              section.stages.includes(stage.id)
            );
            
            // Calculate the angle for each stage in a perfect circle
            // We have 12 stages, so each stage is 30 degrees (360/12), starting from the top (-90 degrees)
            const angle = ((stage.id - 1) * (Math.PI * 2) / 12) - (Math.PI / 2);
            
            // Use a consistent radius for perfect circular alignment
            // All stages are positioned at the same distance from the center
            const stageRadius = circleRadius * 0.85; // Consistent radius for perfect circle
            
            // Calculate position using the angle and radius - add safety checks
            const x = isNaN(angle) ? 0 : stageRadius * Math.cos(angle);
            const y = isNaN(angle) ? 0 : stageRadius * Math.sin(angle);
            
            // Use section colors for consistent styling
            const section = frameworkSections[sectionIndex];
            // Convert section color to rgba formats for different opacities
            const sectionColorRGB = section.color.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '16, 185, 129';
            const hoverBgColor = `rgba(${sectionColorRGB}, 0.1)`;
            
            // Generate a unique key for the group - Important: Using a key prop for React fragments
            const stageKey = `stage-group-${stage.id}`;
            
            return (
              <React.Fragment key={stageKey}>
                {/* Stage bubble - Larger size for better text fit */}
                <div
                  className={`absolute bg-white dark:bg-gray-800 rounded-full cursor-pointer transition-all duration-1000 flex flex-col items-center justify-center z-30 ${
                    isFrameworkVisible ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-180'
                  }`}
                  style={{ 
                    width: '130px', 
                    height: '130px',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    border: `2px solid ${section.color}`,
                    boxShadow: `0 4px 12px rgba(0,0,0,0.08), 0 0 0 2px rgba(255,255,255,0.8)`,
                    transitionDelay: isFrameworkVisible ? `${400 + (stage.id * 120)}ms` : '0ms',
                    transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                  }}
                  onClick={() => handleStageClick(stage.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1.08)`;
                    e.currentTarget.style.boxShadow = `0 8px 20px rgba(0,0,0,0.12), 0 0 0 3px ${section.color}20`;
                    e.currentTarget.style.borderColor = section.color;
                    e.currentTarget.style.backgroundColor = hoverBgColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`;
                    e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.08), 0 0 0 2px rgba(255,255,255,0.8)`;
                    e.currentTarget.style.borderColor = section.color;
                    e.currentTarget.style.backgroundColor = '';
                  }}
                >
                  {/* Stage number badge - Refined styling */}
                  <div 
                    className="absolute top-0 right-0 flex items-center justify-center rounded-full z-10 font-bold text-xs"
                    style={{
                      width: '26px',
                      height: '26px',
                      backgroundColor: section.color,
                      color: 'white',
                      transform: 'translate(25%, -25%)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    {stage.id}
                  </div>
                  
                  <div className={`${section.iconBgColor} p-3 rounded-full mb-2 transition-all duration-700 ${
                    isFrameworkVisible ? 'scale-100 rotate-0' : 'scale-75 rotate-45'
                  }`} style={{ 
                    transitionDelay: isFrameworkVisible ? `${600 + (stage.id * 120)}ms` : '0ms',
                    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}>
                    <div 
                      className={`${section.textColor} hover:rotate-12 transition-all duration-500 ${
                        isFrameworkVisible ? 'scale-100' : 'scale-0'
                      }`}
                      style={{ 
                        transitionDelay: isFrameworkVisible ? `${700 + (stage.id * 120)}ms` : '0ms',
                        transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                      }}
                    >
                      {stage.icon}
                    </div>
                  </div>
                  <div className={`font-semibold text-xs text-center px-2 leading-tight ${section.textColor} transition-all duration-600 ${
                    isFrameworkVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`} style={{ 
                    transitionDelay: isFrameworkVisible ? `${800 + (stage.id * 120)}ms` : '0ms' 
                  }}>
                    {stage.title}
                  </div>
                </div>
                
                {/* We'll create orbit paths separately for each section, not per stage */}
              </React.Fragment>
            );
          })}
        </div>

        {/* Popup Dialog for Stage Details - Enhanced with better visuals */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="sm:max-w-lg md:max-w-2xl border-0 shadow-2xl">
            {selectedStage && (
              <React.Fragment key={`dialog-content-${selectedStage}`}>
                {(() => {
                  // Find which section this selected stage belongs to
                  const sectionIndex = frameworkSections.findIndex(section => 
                    section.stages.includes(selectedStage)
                  );
                  
                  // Get section data
                  const section = frameworkSections[sectionIndex];
                  const sectionColor = section.color;
                  const sectionRgb = sectionColor.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ');
                  
                  return (
                    <div className="overflow-hidden">
                      {/* Visual header with gradient and stage number */}
                      <div 
                        className="relative h-16 flex items-center justify-between px-5 overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${sectionColor}30, ${sectionColor}60)`
                        }}
                      >
                        {/* Background patterns */}
                        <div className="absolute inset-0 opacity-10">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div 
                              key={`bg-pattern-${selectedStage}-${i}`} 
                              className="absolute rounded-full" 
                              style={{
                                width: `${20 + Math.random() * 60}px`,
                                height: `${20 + Math.random() * 60}px`,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                background: sectionColor,
                                opacity: 0.1 + Math.random() * 0.2
                              }}
                            />
                          ))}
                        </div>
                        
                        {/* Section label */}
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium uppercase tracking-wider py-1 px-2.5 rounded-full bg-white/80 text-gray-800">
                            {section.title}
                          </div>
                        </div>
                        
                        {/* Stage number */}
                        <div 
                          className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold text-white"
                          style={{ 
                            background: sectionColor,
                            boxShadow: `0 3px 10px ${sectionColor}50` 
                          }}
                        >
                          {selectedStageData?.id}
                        </div>
                      </div>
                      
                      <DialogHeader className="pb-3 border-b border-gray-200 pt-5 px-6">
                        <DialogTitle className={`flex items-center gap-3 text-2xl font-bold`} style={{ color: sectionColor }}>
                          <div className={`${section.iconBgColor} p-2.5 rounded-full`}>
                            {selectedStageData?.icon}
                          </div>
                          <span>{selectedStageData?.title}</span>
                        </DialogTitle>
                        <DialogDescription className="text-gray-700 dark:text-gray-300 pt-2 text-lg">
                          {selectedStageData?.description}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="p-6">
                        <h3 className={`text-base font-medium mb-4 flex items-center gap-2`} style={{ color: sectionColor }}>
                          <FaMagic className="h-4 w-4" />
                          <span>How Repruv AI helps with {selectedStageData?.title}:</span>
                        </h3>
                        
                        <div className="text-gray-700 dark:text-gray-300">
                          <p className="mb-4">Our AI platform provides advanced functionality to enhance your {selectedStageData?.title.toLowerCase()} process:</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(() => {
                              // Generate specific AI features based on the stage
                              let features = [];
                              
                              switch(selectedStage) {
                                // Planning section
                                case 1: // Inspiration
                                  features = [
                                    { icon: <FaLightbulb className="h-4 w-4" />, text: "AI-powered trend analysis and content gap identification" },
                                    { icon: <FaSearch className="h-4 w-4" />, text: "Audience question mining from social platforms and forums" },
                                    { icon: <FaMagic className="h-4 w-4" />, text: "Creative prompt generation tailored to your niche" },
                                    { icon: <FaChartBar className="h-4 w-4" />, text: "Competitive analysis of content performance" }
                                  ];
                                  break;
                                case 2: // Strategy
                                  features = [
                                    { icon: <FaClipboardList className="h-4 w-4" />, text: "Data-driven content pillar suggestions" },
                                    { icon: <FaChartBar className="h-4 w-4" />, text: "Optimal posting schedule based on audience activity" },
                                    { icon: <FaRecycle className="h-4 w-4" />, text: "Content calendar automation with smart reuse options" },
                                    { icon: <FaSearch className="h-4 w-4" />, text: "Keyword and topic research with volume data" }
                                  ];
                                  break;
                                case 3: // Research
                                  features = [
                                    { icon: <FaSearch className="h-4 w-4" />, text: "Comprehensive topic research with key points" },
                                    { icon: <FaFileAlt className="h-4 w-4" />, text: "Automated brief generation with audience insights" },
                                    { icon: <FaEdit className="h-4 w-4" />, text: "Script outline creation with engagement hooks" },
                                    { icon: <FaClipboardList className="h-4 w-4" />, text: "Reference material organization and summarization" }
                                  ];
                                  break;
                                
                                // Creation section
                                case 4: // Pre-production
                                  features = [
                                    { icon: <FaFileAlt className="h-4 w-4" />, text: "AI-assisted shot planning and storyboarding" },
                                    { icon: <FaClipboardList className="h-4 w-4" />, text: "Auto-generated pre-production checklists" },
                                    { icon: <FaEdit className="h-4 w-4" />, text: "Script refinement and engagement optimization" },
                                    { icon: <FaFileAlt className="h-4 w-4" />, text: "Automatic brief creation for team members" }
                                  ];
                                  break;
                                case 5: // Production
                                  features = [
                                    { icon: <FaVideo className="h-4 w-4" />, text: "Shot list and filming guidance suggestions" },
                                    { icon: <FaCog className="h-4 w-4" />, text: "Real-time feedback on video composition" },
                                    { icon: <FaFileAlt className="h-4 w-4" />, text: "Auto-generated B-roll recommendations" },
                                    { icon: <FaClipboardList className="h-4 w-4" />, text: "Production timeline optimization" }
                                  ];
                                  break;
                                case 6: // Editing
                                  features = [
                                    { icon: <FaEdit className="h-4 w-4" />, text: "Smart editing suggestions for maximum engagement" },
                                    { icon: <FaCog className="h-4 w-4" />, text: "AI-assisted content pacing recommendations" },
                                    { icon: <FaVideo className="h-4 w-4" />, text: "Automatic highlight identification" },
                                    { icon: <FaMagic className="h-4 w-4" />, text: "Visual enhancement recommendations" }
                                  ];
                                  break;
                                
                                // Distribution section
                                case 7: // Optimization
                                  features = [
                                    { icon: <FaCog className="h-4 w-4" />, text: "AI-optimized titles, descriptions and metadata" },
                                    { icon: <FaHashtag className="h-4 w-4" />, text: "Smart hashtag and keyword recommendations" },
                                    { icon: <FaEdit className="h-4 w-4" />, text: "Thumbnail optimization with A/B testing" },
                                    { icon: <FaGlobe className="h-4 w-4" />, text: "Cross-platform content adaptation" }
                                  ];
                                  break;
                                case 8: // Distribution
                                  features = [
                                    { icon: <FaShare className="h-4 w-4" />, text: "Cross-platform distribution scheduling" },
                                    { icon: <FaChartBar className="h-4 w-4" />, text: "Optimal timing recommendations by platform" },
                                    { icon: <FaCog className="h-4 w-4" />, text: "Sequential release strategy planning" },
                                    { icon: <FaGlobe className="h-4 w-4" />, text: "Geographic targeting optimization" }
                                  ];
                                  break;
                                case 9: // Engagement
                                  features = [
                                    { icon: <FaComment className="h-4 w-4" />, text: "Smart comment moderation and engagement tools" },
                                    { icon: <FaReply className="h-4 w-4" />, text: "AI-powered response suggestions" },
                                    { icon: <FaSearch className="h-4 w-4" />, text: "Sentiment analysis on audience feedback" },
                                    { icon: <FaUsers className="h-4 w-4" />, text: "Community management automation" }
                                  ];
                                  break;
                                
                                // Analysis section
                                case 10: // Promotion
                                  features = [
                                    { icon: <FaAd className="h-4 w-4" />, text: "Targeted promotion strategies based on performance" },
                                    { icon: <FaUsers className="h-4 w-4" />, text: "Audience segment identification for ads" },
                                    { icon: <FaChartBar className="h-4 w-4" />, text: "Budget optimization recommendations" },
                                    { icon: <FaSearch className="h-4 w-4" />, text: "Competitor promotion analysis" }
                                  ];
                                  break;
                                case 11: // Analytics
                                  features = [
                                    { icon: <FaChartBar className="h-4 w-4" />, text: "Advanced analytics with actionable insights" },
                                    { icon: <FaSearch className="h-4 w-4" />, text: "Content performance pattern identification" },
                                    { icon: <FaUsers className="h-4 w-4" />, text: "Audience growth and engagement metrics" },
                                    { icon: <FaClipboardList className="h-4 w-4" />, text: "Automated performance reports" }
                                  ];
                                  break;
                                case 12: // Repurposing
                                  features = [
                                    { icon: <FaRecycle className="h-4 w-4" />, text: "Smart content repurposing across platforms" },
                                    { icon: <FaMagic className="h-4 w-4" />, text: "Automated clip generation from long-form content" },
                                    { icon: <FaFileAlt className="h-4 w-4" />, text: "Text transformation from video transcripts" },
                                    { icon: <FaEdit className="h-4 w-4" />, text: "Format adaptation recommendations" }
                                  ];
                                  break;
                                  
                                default:
                                  features = [
                                    { icon: <FaMagic className="h-4 w-4" />, text: "Smart assistance tailored to this stage" },
                                    { icon: <FaCog className="h-4 w-4" />, text: "Time-saving automation of repetitive tasks" },
                                    { icon: <FaChartBar className="h-4 w-4" />, text: "Intelligent recommendations based on performance data" },
                                    { icon: <FaLightbulb className="h-4 w-4" />, text: "Creative enhancement tools" }
                                  ];
                              }
                              
                              return features.map((feature, idx) => (
                                <div 
                                  key={`feature-${selectedStage}-${idx}`}
                                  className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-gray-800/60 shadow-sm border border-gray-100 dark:border-gray-700 opacity-100 translate-y-0 transition-all duration-300"
                                  style={{ transitionDelay: `${0.1 * idx}00ms` }}
                                >
                                  <div 
                                    className={`p-2 rounded-full shrink-0`} 
                                    style={{ 
                                      backgroundColor: `rgba(${sectionRgb}, 0.15)`,
                                      color: sectionColor
                                    }}
                                  >
                                    {feature.icon}
                                  </div>
                                  <span className="text-sm">{feature.text}</span>
                                </div>
                              ));
                            })()}
                          </div>
                          
                          {/* Stage position in the framework */}
                          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium mb-3" style={{ color: sectionColor }}>Stage Position in Framework:</h4>
                            <div className="relative h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800/50">
                              {/* Framework sections visualization */}
                              <div className="flex h-full">
                                {frameworkSections.map((sec, idx) => (
                                  <div 
                                    key={`section-framework-${selectedStage}-${idx}`}
                                    className="flex-1 flex items-center justify-center relative"
                                    style={{ 
                                      backgroundColor: `${sec.color}20`,
                                      borderRight: idx < frameworkSections.length - 1 ? `1px dashed ${sec.color}40` : 'none'
                                    }}
                                  >
                                    <span className={`text-xs font-medium opacity-${sectionIndex === idx ? '100' : '50'}`} style={{ color: sec.color }}>
                                      {sec.title}
                                    </span>
                                    
                                    {/* Show stages in this section */}
                                    <div className="absolute bottom-0 left-0 right-0 flex justify-around">
                                      {sec.stages.map(stageId => (
                                        <div 
                                          key={`stage-indicator-${selectedStage}-${stageId}`}
                                          className={`h-1.5 w-5 rounded-t-sm transition-all duration-300 ${stageId === selectedStage ? 'h-3' : ''}`}
                                          style={{ 
                                            backgroundColor: sec.color,
                                            opacity: stageId === selectedStage ? 1 : 0.3
                                          }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-6 p-3 rounded-md bg-gray-50 dark:bg-gray-800/30 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 border border-gray-100 dark:border-gray-700">
                            <FaMagic className="h-3.5 w-3.5" style={{ color: sectionColor }} />
                            <span>Experience the complete Repruv AI Content Framework with early access</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </React.Fragment>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </section>
  );
}


