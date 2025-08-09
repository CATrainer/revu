import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
        
        <Card className="card-background">
          <CardHeader>
            <CardTitle className="text-3xl text-primary-dark">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-secondary-dark mb-6">
              This terms of service page is under construction. We are working on comprehensive 
              terms that will be fair and transparent for all users.
            </p>
            
            <p className="text-secondary-dark">
              For any questions about our terms, please contact us at{" "}
              <a href="mailto:legal@repruv.co.uk" className="brand-text hover:underline">
                legal@repruv.co.uk
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
