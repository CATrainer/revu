"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BlogPage() {
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
            <CardTitle className="text-3xl">Revu Blog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-3">Blog Coming Soon</h3>
              <p className="text-gray-600 mb-6">
                We&apos;re working on valuable content about review management, customer relations, 
                and business growth strategies. Stay tuned!
              </p>
              
              <Button onClick={() => window.location.href = '/demo'}>
                Schedule a Demo Instead
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
