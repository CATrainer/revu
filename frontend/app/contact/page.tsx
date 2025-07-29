import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Get in Touch</h3>
                <p className="text-gray-600 mb-6">
                  We&apos;d love to hear from you! Whether you have questions about Revu, 
                  need support, or want to discuss your review management needs.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-indigo-600" />
                    <a href="mailto:support@revu.com" className="text-indigo-600 hover:underline">
                      support@revu.com
                    </a>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-indigo-600" />
                    <span className="text-gray-600">Live chat support coming soon</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => window.location.href = '/demo'}>
                    Schedule a Demo
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => window.location.href = 'mailto:support@revu.com'}>
                    Email Support
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
