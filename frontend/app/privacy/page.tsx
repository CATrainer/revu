import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
        
        <Card className="card-background">
          <CardHeader>
            <CardTitle className="text-3xl text-primary-dark">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-secondary-dark mb-6">
              This privacy policy page is under construction. We are committed to protecting your privacy 
              and will have our comprehensive privacy policy available soon.
            </p>
            
            <p className="text-secondary-dark">
              For any privacy-related questions, please contact us at{" "}
              <a href="mailto:privacy@revu.com" className="brand-text hover:underline">
                privacy@revu.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
