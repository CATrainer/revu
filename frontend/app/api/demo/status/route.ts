/**
 * Next.js API Route: Get Demo Status
 * 
 * This route fetches the current demo mode status for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://revu-backend-production.up.railway.app/api/v1';

export async function GET(req: NextRequest) {
  try {
    // Get access token
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('access_token')?.value;
    
    if (!accessToken) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch from FastAPI
    const response = await fetch(`${API_URL}/demo/status`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      // Don't cache - we want fresh status
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Demo status error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
