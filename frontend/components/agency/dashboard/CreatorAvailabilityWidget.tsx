'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Users,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

interface CreatorAvailabilityWidgetProps {
  isLoading?: boolean;
}

export function CreatorAvailabilityWidget({ isLoading = false }: CreatorAvailabilityWidgetProps) {

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Creator Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="flex gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-1 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Coming Soon - Backend endpoint not yet implemented
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-500" />
          Creator Availability
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-indigo-100 dark:bg-indigo-900/20 p-4 mb-4">
            <Calendar className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Creator availability tracking and booking calendar will be available soon. For now, manage creator schedules through campaigns.
          </p>
          <div className="flex gap-2">
            <Link href="/agency/creators">
              <Button size="sm">
                <Users className="h-4 w-4 mr-2" />
                View Creators
              </Button>
            </Link>
            <Link href="/agency/campaigns">
              <Button size="sm" variant="outline">
                Manage Campaigns
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
