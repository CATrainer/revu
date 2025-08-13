"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Mail, MessageCircle, ArrowLeft } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen section-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back to Home Navigation */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="nav-link">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
        
        <Card className="card-background">
          <CardHeader>
            <CardTitle className="text-3xl text-primary-dark">Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-primary-dark">Get in Touch</h3>
                <p className="text-secondary-dark mb-6">
                  We&apos;d love to hear from you! Whether you have questions about Repruv, 
                  need support, or want to discuss your review management needs.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 icon-color" />

                    <a href="mailto:support@repruv.co.uk" className="brand-text hover:underline">
                      support@repruv.co.uk

                    </a>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 icon-color" />
                    <span className="text-secondary-dark">Live chat support coming soon</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4 text-primary-dark">Quick Actions</h3>
                <div className="space-y-3">
                  <Button asChild className="w-full button-primary">
                    <Link href="/demo">Book a Demo</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full button-secondary">
                    <Link href="/join-waitlist">Get Early Access</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full button-secondary">

                    <a href="mailto:support@repruv.co.uk">Email Support</a>

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
