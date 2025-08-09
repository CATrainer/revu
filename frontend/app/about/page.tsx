import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
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
            <CardTitle className="text-3xl text-primary-dark">About Repruv</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-lg text-body-dark mb-6">
                Repruv is revolutionizing how businesses manage their online reputation through 
                AI-powered review management and response automation.
              </p>
              
              <h3 className="text-xl font-semibold mb-3 text-primary-dark">Our Mission</h3>
              <p className="text-secondary-dark mb-6">
                To help businesses build stronger relationships with their customers by making 
                review management effortless, intelligent, and impactful.
              </p>
              
              <h3 className="text-xl font-semibold mb-3 text-primary-dark">Why Repruv?</h3>
              <ul className="list-disc pl-6 text-secondary-dark space-y-2">
                <li>AI-powered responses that sound authentic and personal</li>
                <li>Multi-platform review monitoring and management</li>
                <li>Competitive analysis and insights</li>
                <li>Automated workflows to save time</li>
                <li>Analytics to track your reputation growth</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
