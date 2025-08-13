"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BlogPage() {
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
            <CardTitle className="text-3xl text-primary-dark">Repruv Blog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-3 text-primary-dark">Blog Coming Soon</h3>
              <p className="text-secondary-dark mb-6">
                We&apos;re working on valuable content about review management, customer relations, 
                and business growth strategies. Stay tuned!
              </p>
              
              <Button className="button-primary" onClick={() => window.location.href = '/demo'}>
                Book a Demo Instead
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
