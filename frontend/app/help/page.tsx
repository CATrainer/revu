"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, MessageCircle, Book, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="min-h-screen section-background-alt py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back navigation */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/waiting-area" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Waiting Area
            </Link>
          </Button>
        </div>
        
        <Card className="card-background">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2 text-primary-dark">
              <HelpCircle className="h-8 w-8 brand-text" />
              Help & Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary-dark">
                  <Book className="h-5 w-5 brand-text" />
                  Common Questions
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 text-primary-dark">How do I get started with Revu?</h4>
                    <p className="text-secondary-dark text-sm">
                      After creating your account, you&apos;ll be placed in our waiting area where you can 
                      explore features and request a demo.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 text-primary-dark">When will my demo be scheduled?</h4>
                    <p className="text-secondary-dark text-sm">
                      Our team will contact you within 24 hours to schedule your personalized demo 
                      at a time that works for you.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 text-primary-dark">What platforms does Revu support?</h4>
                    <p className="text-secondary-dark text-sm">
                      Revu integrates with all major review platforms including Google, Yelp, 
                      Facebook, TripAdvisor, and many more.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4 text-primary-dark">Get Direct Support</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 brand-text" />
                    <div>
                      <p className="font-medium text-primary-dark">Email Support</p>
                      <a href="mailto:support@revu.com" className="brand-text hover:underline text-sm">
                        support@revu.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 brand-text" />
                    <div>
                      <p className="font-medium text-primary-dark">Live Chat</p>
                      <p className="text-secondary-dark text-sm">Coming soon - 24/7 support</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/waiting-area" className="flex items-center justify-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Waiting Area
                    </Link>
                  </Button>
                  <Button className="w-full" onClick={() => window.location.href = 'mailto:support@revu.com'}>
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => window.location.href = '/demo'}>
                    Schedule a Demo
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
