'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download, Scroll } from "lucide-react";
import { termsAndConditionsContent } from "@/lib/terms-content";

export default function TermsPage() {
  const handleDownload = () => {
    // Create a blob with the content
    const blob = new Blob([termsAndConditionsContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Repruv-Terms-of-Service.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen section-background py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Navigation */}
        <div className="mb-10 flex items-center justify-between">
          <Button 
            variant="ghost" 
            asChild 
            className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
          >
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="font-semibold">Back to Home</span>
            </Link>
          </Button>
          
          <Button 
            onClick={handleDownload}
            className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Terms
          </Button>
        </div>
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scroll className="h-10 w-10 text-green-500" />
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 bg-clip-text text-transparent">
              Terms of Service
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Your agreement with Repruv for using our platform
          </p>
        </div>

        {/* Content Card */}
        <Card className="card-background border-gray-200/50 dark:border-gray-800/50 shadow-lg backdrop-blur-sm">
          <CardContent className="pt-8 pb-8">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 leading-relaxed">
                {termsAndConditionsContent}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Contact Footer */}
        <Card className="mt-8 card-background border-green-200/50 dark:border-green-800/20 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600/10 to-green-500/5 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-full p-4 shadow-lg">
                <Scroll className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Questions About These Terms?</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  If you have any questions or concerns regarding these Terms of Service, please contact us at:
                </p>
                <p className="text-green-600 dark:text-green-400 font-semibold text-lg">info@repruv.co.uk</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
