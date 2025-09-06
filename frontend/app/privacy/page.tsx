'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download, ChevronDown, ChevronUp, Shield, Eye, Users, Database, Globe, Lock } from "lucide-react";
import { downloadPrivacyAsPDF } from "@/lib/pdf-utils";
import { motion, AnimatePresence } from "framer-motion";

export default function PrivacyPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  const sectionVariants = {
    collapsed: { height: 0, opacity: 0 },
    expanded: { height: "auto", opacity: 1 }
  };

  return (
    <div className="min-h-screen section-background py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Back to Home Navigation with enhanced styling */}
        <div className="mb-10 flex items-center justify-between">
          <Button 
            variant="ghost" 
            asChild 
            className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
          >
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="font-semibold">Back to Home</span>
            </Link>
          </Button>
          
          <Button 
            onClick={downloadPrivacyAsPDF}
            className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <Download className="mr-2 h-4 w-4" />
            Save Document
          </Button>
        </div>
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-secondary-dark max-w-3xl mx-auto">
            How we protect and manage your data at Repruv
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Introduction Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="card-background border-gray-200/50 dark:border-gray-800/50 shadow-lg backdrop-blur-sm overflow-hidden">
              <CardHeader className="space-y-1 bg-gradient-to-r from-white/40 to-white/20 dark:from-gray-900/40 dark:to-gray-900/20">
                <CardTitle className="text-2xl text-center text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-secondary-dark mb-4">
                  At Repruv, we take your privacy seriously and are committed to protecting your personal and business data. This Privacy Policy describes how we collect, use, process, store, and protect your information when you use our reputation management platform.
                </p>
                <p className="text-secondary-dark">
                  Our platform helps businesses manage their online reputation by collecting reviews from multiple platforms (such as Google, TrustPilot, Facebook, Instagram, etc.), providing AI-generated responses, tracking social media mentions, analysing performance, and offering collaborative team tools.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Collapsible Sections */}
          {[
            {
              id: "information",
              title: "Information We Collect",
              icon: <Eye className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Personal Information</h3>
                    <ul className="list-disc pl-5 text-secondary-dark">
                      <li>Name, email address, phone number</li>
                      <li>Business name, contact details</li>
                    </ul>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Account Information</h3>
                    <ul className="list-disc pl-5 text-secondary-dark">
                      <li>Username, password</li>
                      <li>Account settings, preferences, notifications</li>
                    </ul>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Third-Party Platform Data</h3>
                    <p className="text-secondary-dark mb-2">To aggregate reviews and feedback from multiple sources, we connect to third-party platforms, such as:</p>
                    <ul className="list-disc pl-5 text-secondary-dark mb-2">
                      <li>Google Reviews, TrustPilot, Facebook, Instagram, TikTok, Twitter, LinkedIn, YouTube, TripAdvisor, Check-a-Trade, etc.</li>
                    </ul>
                    <p className="text-secondary-dark mb-2">When you connect your third-party platform accounts, we collect:</p>
                    <ul className="list-disc pl-5 text-secondary-dark">
                      <li>Reviews, ratings, feedback, mentions, and comments from these platforms</li>
                      <li>User-generated content such as posts, comments, and media shared on these platforms</li>
                      <li>Interactions and responses to reviews and comments</li>
                      <li>Competitor data for benchmarking purposes</li>
                    </ul>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">AI-Generated Data</h3>
                    <ul className="list-disc pl-5 text-secondary-dark">
                      <li>We use AI to generate automated responses to reviews and social media feedback. These responses are stored in your account for reporting and analysis.</li>
                    </ul>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Usage Data</h3>
                    <ul className="list-disc pl-5 text-secondary-dark">
                      <li>Data about your interactions with the platform (e.g., IP address, browser type, device details)</li>
                      <li>Platform performance data, including user engagement with reviews, competitor performance, and sentiment analysis</li>
                    </ul>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Cookies and Tracking Technologies</h3>
                    <ul className="list-disc pl-5 text-secondary-dark">
                      <li>We use cookies and similar technologies to improve user experience and analyze platform usage.</li>
                    </ul>
                  </div>
                </div>
              ),
              delay: 0.2
            },
            {
              id: "usage",
              title: "How We Use Your Information",
              icon: <Database className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <p className="text-secondary-dark">Your data is used to provide, enhance, and personalize the Repruv platform&apos;s reputation management services:</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-l-4 border-green-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Reputation Management</h3>
                      <p className="text-secondary-dark text-sm">Aggregating reviews and feedback from platforms like Google, TrustPilot, Facebook, Instagram, and others, into one centralized dashboard.</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-l-4 border-blue-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">AI-Powered Responses</h3>
                      <p className="text-secondary-dark text-sm">Automating the process of generating personalized, brand-consistent responses to reviews and social media feedback.</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-l-4 border-purple-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Competitor Tracking</h3>
                      <p className="text-secondary-dark text-sm">Monitoring competitor reviews and social media activity for performance benchmarking.</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-l-4 border-pink-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Social Media Monitoring</h3>
                      <p className="text-secondary-dark text-sm">Tracking mentions and feedback across platforms to ensure timely responses and engagement.</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-l-4 border-amber-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Analytics & Reporting</h3>
                      <p className="text-secondary-dark text-sm">Offering actionable insights based on your review data, customer sentiment, and competitor performance.</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-l-4 border-cyan-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Team Collaboration</h3>
                      <p className="text-secondary-dark text-sm">Facilitating task assignments, role-based permissions, and workflow automation for managing reviews and team workflows.</p>
                    </div>
                  </div>
                </div>
              ),
              delay: 0.3
            },
            {
              id: "verification",
              title: "User Verification & Third-Party Access",
              icon: <Users className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <p className="text-secondary-dark">To use Repruv, you must:</p>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 flex gap-4 items-start">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">1</div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Verify Your Account</h3>
                      <p className="text-secondary-dark">Authenticate and verify your third-party accounts (such as Google, Instagram, TrustPilot, etc.) to connect your data to Repruv.</p>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 flex gap-4 items-start">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">2</div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Grant Permissions</h3>
                      <p className="text-secondary-dark mb-2">You explicitly grant us access to:</p>
                      <ul className="list-disc pl-5 text-secondary-dark">
                        <li><span className="font-medium text-gray-700 dark:text-gray-300">Collect:</span> Retrieve reviews, feedback, mentions, and other data from third-party platforms</li>
                        <li><span className="font-medium text-gray-700 dark:text-gray-300">Modify:</span> Post responses to reviews, feedback, and comments on your behalf</li>
                        <li><span className="font-medium text-gray-700 dark:text-gray-300">Analyse:</span> Use your data to generate reports and insights to help you manage your reputation</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                    <p className="text-secondary-dark">By granting us access to third-party platforms, you authorize us to act on your behalf for the purpose of managing and improving your online reputation. You can revoke access to any third-party platforms at any time through your Repruv account settings.</p>
                  </div>
                </div>
              ),
              delay: 0.4
            },
            {
              id: "sharing",
              title: "Sharing Your Information",
              icon: <Database className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <p className="text-secondary-dark mb-2">We do not sell, rent, or share your personal data for marketing purposes. We may share your data in the following circumstances:</p>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Service Providers</h3>
                    <p className="text-secondary-dark">We may share your data with third-party vendors who assist in providing our services (e.g., cloud storage, analytics, etc.).</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Legal Requirements</h3>
                    <p className="text-secondary-dark">We may disclose your data if required by law or court order, or to protect our rights or users.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Business Transactions</h3>
                    <p className="text-secondary-dark">If Repruv is involved in a merger, acquisition, or sale of assets, your data may be transferred as part of the transaction.</p>
                  </div>
                </div>
              ),
              delay: 0.5
            },
            {
              id: "security",
              title: "Data Security",
              icon: <Lock className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <p className="text-secondary-dark">We implement robust security measures to protect your personal and platform data, including:</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
                      <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                        <Lock className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Encryption</h3>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
                      <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                        <Database className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Secure Storage</h3>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
                      <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                        <Shield className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Security Audits</h3>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 p-4 border border-amber-200 dark:border-amber-900/30">
                    <p className="text-amber-700 dark:text-amber-300 text-sm">
                      <span className="font-semibold">Important:</span> No method of data transmission or storage is completely secure, and we cannot guarantee the absolute security of your data.
                    </p>
                  </div>
                </div>
              ),
              delay: 0.6
            },
            {
              id: "rights",
              title: "Your Data Rights",
              icon: <Users className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <p className="text-secondary-dark">Under applicable data protection laws (such as GDPR, CCPA), you may have the following rights:</p>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-t-4 border-blue-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Access</h3>
                      <p className="text-secondary-dark text-sm">Request a copy of your data</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-t-4 border-green-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Correction</h3>
                      <p className="text-secondary-dark text-sm">Update or correct inaccurate data</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-t-4 border-red-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Deletion</h3>
                      <p className="text-secondary-dark text-sm">Request deletion of your data, subject to legal obligations</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-t-4 border-amber-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Opt-Out</h3>
                      <p className="text-secondary-dark text-sm">Unsubscribe from marketing or opt out of non-essential data collection</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 border-t-4 border-purple-500">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Portability</h3>
                      <p className="text-secondary-dark text-sm">Request a portable copy of your data</p>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="font-medium text-gray-800 dark:text-gray-200">To exercise your rights, please contact us at:</p>
                    <p className="text-green-700 dark:text-green-400 font-semibold mt-1">info@repruv.co.uk</p>
                  </div>
                </div>
              ),
              delay: 0.7
            },
            {
              id: "retention",
              title: "Data Retention & International Transfers",
              icon: <Globe className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Data Retention</h3>
                    <p className="text-secondary-dark">We retain your data for as long as your account is active or as necessary to provide our services. If you delete your account, we may retain certain data for legitimate business purposes or as required by law.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">International Data Transfers</h3>
                    <p className="text-secondary-dark">Your data may be transferred to and stored in countries outside your jurisdiction, including those with different data protection laws. By using Repruv, you consent to these international data transfers.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Children&apos;s Privacy</h3>
                    <p className="text-secondary-dark">Our platform is not intended for use by children under the age of 13. We do not knowingly collect data from children. If we learn we have collected such data, we will delete it immediately.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Changes to This Privacy Policy</h3>
                    <p className="text-secondary-dark">We may update this Privacy Policy from time to time. If significant changes occur, we will notify you via email or post the updated policy on our website. Please review this Privacy Policy periodically.</p>
                  </div>
                </div>
              ),
              delay: 0.8
            }
          ].map((section) => (
            <motion.div 
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: section.delay }}
            >
              <Card className="card-background border-gray-200/50 dark:border-gray-800/50 shadow-lg backdrop-blur-sm overflow-hidden">
                <CardHeader 
                  className="space-y-1 bg-gradient-to-r from-white/40 to-white/20 dark:from-gray-900/40 dark:to-gray-900/20 cursor-pointer hover:bg-gradient-to-r hover:from-white/50 hover:to-white/30 dark:hover:from-gray-900/50 dark:hover:to-gray-900/30 transition-all duration-300"
                  onClick={() => toggleSection(section.id)}
                >
                  <CardTitle className="text-xl text-gray-800 dark:text-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {section.icon}
                      <span>{section.title}</span>
                    </div>
                    {expandedSection === section.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <AnimatePresence>
                  {expandedSection === section.id && (
                    <motion.div
                      initial="collapsed"
                      animate="expanded"
                      exit="collapsed"
                      variants={sectionVariants}
                      transition={{ duration: 0.3 }}
                    >
                      <CardContent className="pt-6">
                        {section.content}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}

          {/* Contact Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <Card className="card-background border-green-200/50 dark:border-green-800/20 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-600/10 to-green-500/5 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-full p-4 shadow-lg">
                    <Shield className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Contact Us</h3>
                    <p className="text-secondary-dark mb-4">If you have any questions about our privacy practices or need to exercise your data rights, please contact us at:</p>
                    <p className="text-green-600 dark:text-green-400 font-semibold text-lg">info@repruv.co.uk</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
