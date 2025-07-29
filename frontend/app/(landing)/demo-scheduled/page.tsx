"use client";

import { useEffect, useState } from "react";
import { InlineWidget } from "react-calendly";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, ArrowLeft } from "lucide-react";

const DemoScheduledPage = () => {
  const [userInfo, setUserInfo] = useState<{name?: string; email?: string}>({});

  useEffect(() => {
    // Get user info from localStorage or URL params if available
    const savedUserInfo = localStorage.getItem('demoUserInfo');
    if (savedUserInfo) {
      setUserInfo(JSON.parse(savedUserInfo));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Demo Request Submitted Successfully!
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Thank you for your interest in Revu. We&apos;re excited to show you how our platform can transform your review management strategy.
            </p>
          </div>

          {/* Calendly Widget */}
          <Card className="mb-8">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Calendar className="h-6 w-6 text-indigo-600" />
                Schedule Your Personalized Demo
              </CardTitle>
              <CardDescription>
                Choose a time that works best for you. Our team will be ready with a customized demonstration based on your specific needs and industry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InlineWidget
                url={process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/revu-demo/30min"}
                styles={{ height: '700px' }}
                prefill={userInfo.name && userInfo.email ? {
                  name: userInfo.name,
                  email: userInfo.email
                } : undefined}
              />
            </CardContent>
          </Card>

          {/* What to Expect */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>What to Expect</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>30-minute personalized walkthrough</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Live demonstration of AI-powered responses</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Custom dashboard overview for your industry</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>ROI calculation specific to your business</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Q&A session tailored to your needs</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preparation Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-0.5">→</span>
                    <span>Have your current review platforms ready to discuss</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-0.5">→</span>
                    <span>Think about your biggest review management challenges</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-0.5">→</span>
                    <span>Consider your team size and workflow needs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-0.5">→</span>
                    <span>Prepare any specific questions about features</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-0.5">→</span>
                    <span>Have stakeholders join if decision-making is collaborative</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Alternative Options */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Can&apos;t find a suitable time right now?</h3>
                <p className="text-gray-600 mb-4">
                  No worries! You can always schedule your demo later or reach out to us directly.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="outline" onClick={() => window.location.href = 'mailto:demo@revu.com'}>
                    Email Us Instead
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/'}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Return to Homepage
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              You&apos;ll receive a confirmation email with meeting details once you schedule your demo.
              <br />
              Have questions? Contact us at{" "}
              <a href="mailto:support@revu.com" className="text-indigo-600 hover:underline">
                support@revu.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoScheduledPage;
