'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download, ChevronDown, ChevronUp, Shield, Scroll, Users, Store, Briefcase, Scale } from "lucide-react";
import { downloadTermsAsPDF } from "@/lib/pdf-utils";
import { motion, AnimatePresence } from "framer-motion";

export default function TermsPage() {
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
            onClick={downloadTermsAsPDF}
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
            Terms and Conditions
          </h1>
          <p className="text-xl text-secondary-dark max-w-3xl mx-auto">
            Your agreement with Repruv for using our platform
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
                  <Scroll className="h-5 w-5 text-green-500" />
                  Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-secondary-dark mb-4">
                  These Terms and Conditions (&quot;Agreement&quot;) govern your use of Repruv, a platform designed to help businesses manage their online reputation through review aggregation, AI-driven responses, competitor tracking, social media monitoring, and analytics. By using Repruv, you agree to comply with the terms outlined below.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Collapsible Sections */}
          {[
            {
              id: "services",
              title: "Description of Services",
              icon: <Shield className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <p className="text-secondary-dark mb-4">Repruv provides the following services:</p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-5 border-l-4 border-green-500 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-2">
                          <svg className="h-5 w-5 text-green-600 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            <path d="m9 14 2 2 4-4"></path>
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Review Management</h3>
                      </div>
                      <p className="text-secondary-dark text-sm">Centralizes and organizes reviews from Google, TrustPilot, Facebook, Instagram, and other platforms in one easy-to-use inbox.</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-5 border-l-4 border-blue-500 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a10 10 0 1 0 10 10H12V2Z"></path>
                            <path d="M21.17 8H12V2.83c2 .52 3.84 1.68 5.17 3.17 1.5 1.33 2.66 3.17 3.17 5.17Z"></path>
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">AI Responses</h3>
                      </div>
                      <p className="text-secondary-dark text-sm">Automates the process of responding to reviews and social media feedback using artificial intelligence to ensure a consistent brand voice.</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-5 border-l-4 border-purple-500 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-2">
                          <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Competitor Tracking</h3>
                      </div>
                      <p className="text-secondary-dark text-sm">Tracks and benchmarks your brand&apos;s reputation against competitors.</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-5 border-l-4 border-pink-500 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-pink-100 dark:bg-pink-900/30 rounded-full p-2">
                          <svg className="h-5 w-5 text-pink-600 dark:text-pink-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"></path>
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Social Media Monitoring</h3>
                      </div>
                      <p className="text-secondary-dark text-sm">Monitors mentions and feedback from social media platforms such as Facebook, Instagram, Twitter, LinkedIn, etc.</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-5 border-l-4 border-amber-500 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-amber-100 dark:bg-amber-900/30 rounded-full p-2">
                          <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Analytics & Reporting</h3>
                      </div>
                      <p className="text-secondary-dark text-sm">Provides insights based on your review data to help you make informed decisions about your business&apos;s reputation.</p>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-5 border-l-4 border-cyan-500 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-cyan-100 dark:bg-cyan-900/30 rounded-full p-2">
                          <svg className="h-5 w-5 text-cyan-600 dark:text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Team Collaboration</h3>
                      </div>
                      <p className="text-secondary-dark text-sm">Enables internal team collaboration with task assignments, role-based permissions, and workflow automation.</p>
                    </div>
                  </div>
                </div>
              ),
              delay: 0.2
            },
            {
              id: "registration",
              title: "Account Registration & Verification",
              icon: <Users className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <p className="text-secondary-dark">To use Repruv, you must register for an account by providing accurate information. You will need to verify your account and grant us access to your third-party platform accounts (such as Google, Facebook, Instagram, LinkedIn, TikTok, TrustPilot, etc.) to use the full features of the platform. By granting access, you authorize us to collect data from these platforms for the purpose of providing reputation management services.</p>
                  
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border-t-2 border-green-500">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Access Permissions</h3>
                    <p className="text-secondary-dark mb-2">By connecting your accounts to Repruv, you grant us permission to:</p>
                    <ul className="list-disc pl-5 space-y-1 text-secondary-dark">
                      <li>View and download reviews and comments from your profiles</li>
                      <li>Post responses on your behalf when authorized</li>
                      <li>Monitor mentions of your brand across platforms</li>
                      <li>Collect analytics data to provide insights and reports</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800/30">
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      <span className="font-semibold">Note:</span> You can revoke these permissions at any time through your account settings, though this may limit the functionality of the platform.
                    </p>
                  </div>
                </div>
              ),
              delay: 0.3
            },
            {
              id: "subscription",
              title: "Subscription Fees and Payment",
              icon: <Store className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Subscription Fees</h3>
                    <p className="text-secondary-dark">You may need to subscribe to access certain features. Details of the subscription fees will be outlined during registration.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Billing</h3>
                    <p className="text-secondary-dark">Subscription fees are non-refundable unless specified otherwise. Payments will be processed through our chosen third-party payment processor.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Subscription Renewal</h3>
                    <p className="text-secondary-dark">Your subscription will automatically renew unless you cancel before the renewal date.</p>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4 border border-amber-200 dark:border-amber-800/30">
                    <h3 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">Important Payment Information</h3>
                    <ul className="list-disc pl-5 space-y-1 text-amber-700 dark:text-amber-300 text-sm">
                      <li>Your subscription will be charged on a recurring basis according to your chosen plan</li>
                      <li>Price changes will be notified at least 30 days in advance</li>
                      <li>Cancellations must be made at least 24 hours before your renewal date</li>
                    </ul>
                  </div>
                </div>
              ),
              delay: 0.4
            },
            {
              id: "user-obligations",
              title: "User Obligations & Acceptable Use",
              icon: <Users className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">User Responsibilities</h3>
                    <p className="text-secondary-dark">You are responsible for ensuring that the data you provide is accurate and for maintaining the security of your account credentials. You agree to use our services solely for lawful purposes and in compliance with applicable laws.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Prohibited Activities</h3>
                    <ul className="list-disc pl-5 space-y-1 text-secondary-dark">
                      <li>Using the platform for any illegal activities</li>
                      <li>Attempting to gain unauthorized access to other users&apos; accounts</li>
                      <li>Uploading malicious code or attempting to disrupt the platform</li>
                      <li>Violating third-party intellectual property rights</li>
                      <li>Engaging in fraudulent activities or misrepresentation</li>
                      <li>Using the platform to harass, defame, or intimidate others</li>
                      <li>Attempting to reverse-engineer the platform&apos;s code</li>
                    </ul>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-4 border border-red-200 dark:border-red-800/30">
                    <p className="text-red-700 dark:text-red-300 text-sm">
                      <span className="font-semibold">Warning:</span> Violation of these terms may result in immediate account suspension or termination, and potential legal action if warranted by the severity of the violation.
                    </p>
                  </div>
                </div>
              ),
              delay: 0.5
            },
            {
              id: "intellectual-property",
              title: "Intellectual Property",
              icon: <Briefcase className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Ownership</h3>
                    <p className="text-secondary-dark">Repruv retains full ownership of all intellectual property related to the platform and its services, including software, logos, and content.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">License</h3>
                    <p className="text-secondary-dark">We grant you a limited, non-exclusive, non-transferable license to access and use the platform in accordance with these Terms.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Your Content</h3>
                    <p className="text-secondary-dark">You retain ownership of your content, including reviews and responses that you create. However, by using Repruv, you grant us a license to store, display, and process this content for the purpose of providing our services.</p>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800/30">
                    <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Copyright & Trademark Notice</h3>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">All content, features, and functionality on the Repruv platform, including text, graphics, logos, icons, and software, are the exclusive property of Repruv and are protected by international copyright, trademark, and other intellectual property laws.</p>
                  </div>
                </div>
              ),
              delay: 0.6
            },
            {
              id: "termination",
              title: "Termination",
              icon: <Shield className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">By You</h3>
                      <p className="text-secondary-dark">You may terminate your account at any time by following the account cancellation process in your account settings.</p>
                      <ul className="list-disc pl-5 space-y-1 text-secondary-dark mt-2 text-sm">
                        <li>Cancellation will take effect at the end of your current billing cycle</li>
                        <li>You will lose access to all platform features upon termination</li>
                        <li>Your data will be retained in accordance with our Privacy Policy</li>
                      </ul>
                    </div>
                    
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">By Us</h3>
                      <p className="text-secondary-dark">We reserve the right to suspend or terminate your account if you violate these Terms or engage in unlawful activity.</p>
                      <ul className="list-disc pl-5 space-y-1 text-secondary-dark mt-2 text-sm">
                        <li>We may terminate access immediately for serious violations</li>
                        <li>We will provide notice when possible before termination</li>
                        <li>We may remove any content that violates these Terms</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4 border border-amber-200 dark:border-amber-800/30">
                    <h3 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">Effect of Termination</h3>
                    <p className="text-amber-700 dark:text-amber-300 text-sm">Upon termination, you will immediately lose access to the platform and its services. Any outstanding fees will be charged, and no refunds will be provided unless otherwise specified in these Terms.</p>
                  </div>
                </div>
              ),
              delay: 0.7
            },
            {
              id: "limitation-liability",
              title: "Limitation of Liability",
              icon: <Scale className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Liability</h3>
                    <p className="text-secondary-dark">Repruv is not liable for any indirect, incidental, or consequential damages arising from your use of the platform. We do not guarantee specific outcomes from the services provided.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Service Availability</h3>
                    <p className="text-secondary-dark">We do not guarantee that the platform will be error-free or uninterrupted, and we are not responsible for any downtime caused by third-party service providers.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Third-Party Services</h3>
                    <p className="text-secondary-dark">Our platform integrates with third-party services such as Google, Facebook, Instagram, etc. We are not responsible for the availability, accuracy, or policies of these third-party services.</p>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4 border border-amber-200 dark:border-amber-800/30">
                    <p className="text-amber-700 dark:text-amber-300 text-sm">
                      <span className="font-semibold">Important:</span> In no event shall Repruv&apos;s total liability to you exceed the amount paid by you for the services in the 12 months preceding the event giving rise to the liability.
                    </p>
                  </div>
                </div>
              ),
              delay: 0.8
            },
            {
              id: "governance",
              title: "Dispute Resolution & Governing Law",
              icon: <Scale className="h-5 w-5 text-green-500" />,
              content: (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Dispute Resolution</h3>
                    <p className="text-secondary-dark">In the event of a dispute, the parties agree to first attempt resolution through mediation. If mediation fails, the dispute will be resolved through binding arbitration under the laws of England and Wales.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Governing Law</h3>
                    <p className="text-secondary-dark">These Terms and Conditions will be governed by and construed in accordance with the laws of England and Wales.</p>
                  </div>
                  
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Changes to These Terms</h3>
                    <p className="text-secondary-dark">We may update these Terms from time to time. Significant changes will be communicated to you by email or via our platform. By continuing to use the service after such changes, you agree to the updated Terms.</p>
                  </div>
                </div>
              ),
              delay: 0.9
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
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <Card className="card-background border-green-200/50 dark:border-green-800/20 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-600/10 to-green-500/5 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-full p-4 shadow-lg">
                    <Scroll className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Contact Us</h3>
                    <p className="text-secondary-dark mb-4">If you have any questions regarding these Terms and Conditions, please contact us at:</p>
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
