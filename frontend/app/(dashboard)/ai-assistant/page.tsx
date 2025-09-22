// frontend/app/(dashboard)/ai-assistant/page.tsx
import { Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AIAssistantPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-dark mb-2">Ask Repruv AI Anything About Your Reviews</h1>
        <p className="text-sm md:text-base text-secondary-dark">Get instant insights from your review data using natural language</p>
      </div>
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            <div className="relative">
              {/* Note: Input field for user to enter their query */}
              <input
                type="text"
                placeholder="e.g., 'Why are ratings dropping in Leeds?' or 'Show me reviews mentioning delivery times'"
                className="w-full h-11 md:h-auto px-4 py-3 pr-12 text-primary-dark placeholder:text-muted-dark border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent card-background"
              />
              <Button
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-11 w-11 md:h-10 md:w-10"
              >
                <Brain className="h-5 w-5" />
              </Button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-secondary-dark mb-2">Suggested Queries:</h3>
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