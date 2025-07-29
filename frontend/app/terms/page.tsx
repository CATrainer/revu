import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              This terms of service page is under construction. We are working on comprehensive 
              terms that will be fair and transparent for all users.
            </p>
            
            <p className="text-gray-600">
              For any questions about our terms, please contact us at{" "}
              <a href="mailto:legal@revu.com" className="text-indigo-600 hover:underline">
                legal@revu.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
