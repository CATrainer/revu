'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { downloadTermsAsPDF } from "@/lib/pdf-utils";

export default function TermsPage() {
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
        
        <div className="space-y-6">
          <Card className="card-background">
            <CardHeader>
              <CardTitle className="text-3xl text-primary-dark">Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary-dark mb-6">
                Download our complete Terms and Conditions document to understand your rights 
                and responsibilities when using Repruv. This document outlines the terms of service, 
                user obligations, intellectual property rights, data privacy policies, and important legal information.
              </p>
              <Button 
                onClick={downloadTermsAsPDF}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Terms and Conditions (PDF)
              </Button>
            </CardContent>
          </Card>

          <Card className="card-background">
            <CardHeader>
              <CardTitle className="text-2xl text-primary-dark">What's Included</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-primary-dark mb-2">Service Description</h4>
                  <p className="text-secondary-dark text-sm mb-4">Comprehensive overview of all Repruv services including review management, AI responses, and analytics.</p>
                  
                  <h4 className="font-semibold text-primary-dark mb-2">User Rights & Responsibilities</h4>
                  <p className="text-secondary-dark text-sm mb-4">Clear guidelines on acceptable use, account obligations, and prohibited activities.</p>
                  
                  <h4 className="font-semibold text-primary-dark mb-2">Payment Terms</h4>
                  <p className="text-secondary-dark text-sm">Detailed information about subscription fees, billing cycles, and refund policies.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-primary-dark mb-2">Intellectual Property</h4>
                  <p className="text-secondary-dark text-sm mb-4">Protection of Repruv's intellectual property and your content ownership rights.</p>
                  
                  <h4 className="font-semibold text-primary-dark mb-2">Data Privacy</h4>
                  <p className="text-secondary-dark text-sm mb-4">How we collect, use, and protect your personal and business data.</p>
                  
                  <h4 className="font-semibold text-primary-dark mb-2">Legal Compliance</h4>
                  <p className="text-secondary-dark text-sm">Governing law, dispute resolution, and liability limitations.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-background">
            <CardHeader>
              <CardTitle className="text-2xl text-primary-dark">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary-dark mb-4">
                If you have any questions about our Terms and Conditions or need legal clarification, 
                please don't hesitate to contact us:
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 p-4 rounded-lg">
                <p className="font-semibold text-blue-600 dark:text-blue-400">
                  Email: info@repruv.co.uk
                </p>
                <p className="text-secondary-dark mt-2">
                  We aim to respond to all legal inquiries within 24 hours.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
