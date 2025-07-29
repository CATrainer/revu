import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              This privacy policy page is under construction. We are committed to protecting your privacy 
              and will have our comprehensive privacy policy available soon.
            </p>
            
            <p className="text-gray-600">
              For any privacy-related questions, please contact us at{" "}
              <a href="mailto:privacy@revu.com" className="text-indigo-600 hover:underline">
                privacy@revu.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
