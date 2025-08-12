'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { downloadPrivacyAsPDF } from "@/lib/pdf-utils";

export default function PrivacyPage() {
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
              <CardTitle className="text-3xl text-primary-dark">Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-secondary-dark mb-6">
                Download our comprehensive Privacy Policy document to understand how we collect, use, 
                and protect your personal information. This document outlines our data practices, 
                your privacy rights, security measures, and our commitment to protecting your data.
              </p>
              <Button 
                onClick={downloadPrivacyAsPDF}
                className="button-primary"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Privacy Policy (PDF)
              </Button>
            </CardContent>
          </Card>

          <Card className="card-background">
            <CardHeader>
              <CardTitle className="text-2xl text-primary-dark">What&apos;s Included</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-primary-dark mb-2">Information Collection</h4>
                  <p className="text-secondary-dark text-sm mb-4">Detailed explanation of what personal and business data we collect and why.</p>
                  
                  <h4 className="font-semibold text-primary-dark mb-2">Data Usage</h4>
                  <p className="text-secondary-dark text-sm mb-4">How we use your information to provide reputation management services.</p>
                  
                  <h4 className="font-semibold text-primary-dark mb-2">Data Sharing</h4>
                  <p className="text-secondary-dark text-sm">Our policies on sharing data with third parties and service providers.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-primary-dark mb-2">Your Rights</h4>
                  <p className="text-secondary-dark text-sm mb-4">Complete overview of your data rights under GDPR, CCPA, and other regulations.</p>
                  
                  <h4 className="font-semibold text-primary-dark mb-2">Data Security</h4>
                  <p className="text-secondary-dark text-sm mb-4">Security measures we implement to protect your personal information.</p>
                  
                  <h4 className="font-semibold text-primary-dark mb-2">International Transfers</h4>
                  <p className="text-secondary-dark text-sm">Information about data storage and processing across different jurisdictions.</p>
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
                If you have any questions about our privacy practices or need to exercise your data rights, 
                please don&apos;t hesitate to contact us:
              </p>
              <div className="section-background-alt p-4 rounded-lg">
                <p className="font-semibold brand-text">
                  Email: info@repruv.co.uk
                </p>
                <p className="text-secondary-dark mt-2">
                  We aim to respond to all privacy inquiries within 24 hours.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
