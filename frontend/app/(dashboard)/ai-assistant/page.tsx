// frontend/app/(dashboard)/ai-assistant/page.tsx
import { Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AIAssistantPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Ask RevU AI Anything About Your Reviews</h1>
        <p className="text-gray-600">Get instant insights from your review data using natural language</p>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="e.g., 'Why are ratings dropping in Leeds?' or 'Show me reviews mentioning delivery times'"
                className="w-full px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Button
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                <Brain className="h-5 w-5" />
              </Button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Suggested Queries:</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  What are customers saying about our new menu?
                </Button>
                <Button variant="outline" size="sm">
                  Which staff members get the most praise?
                </Button>
                <Button variant="outline" size="sm">
                  Compare this month&apos;s sentiment to last month
                </Button>
                <Button variant="outline" size="sm">
                  Show me all delivery complaints
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}