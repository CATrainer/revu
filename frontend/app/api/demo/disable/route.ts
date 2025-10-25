/**
 * Next.js API Route: Disable Demo Mode
 * 
 * This route acts as a proxy between the frontend and FastAPI backend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://revu-backend-production.up.railway.app/api/v1';

export async function POST(req: NextRequest) {
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
    
    // Forward request to FastAPI
    const response = await fetch(`${API_URL}/demo/disable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Demo disable error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
