"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Mail, MessageCircle, ArrowLeft } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back to Home Navigation */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="text-gray-600 hover:text-gray-900">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Get in Touch</h3>
                <p className="text-gray-600 mb-6">
                  We&apos;d love to hear from you! Whether you have questions about Revu, 
                  need support, or want to discuss your review management needs.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-indigo-600" />
                    <a href="mailto:support@revu.com" className="text-indigo-600 hover:underline">
                      support@revu.com
                    </a>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-indigo-600" />
                    <span className="text-gray-600">Live chat support coming soon</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/demo">Schedule a Demo</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/join-waitlist">Join Waitlist</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <a href="mailto:support@revu.com">Email Support</a>
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
