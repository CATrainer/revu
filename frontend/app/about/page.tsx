import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">About Revu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-6">
                Revu is revolutionizing how businesses manage their online reputation through 
                AI-powered review management and response automation.
              </p>
              
              <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
              <p className="text-gray-600 mb-6">
                To help businesses build stronger relationships with their customers by making 
                review management effortless, intelligent, and impactful.
              </p>
              
              <h3 className="text-xl font-semibold mb-3">Why Revu?</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
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
