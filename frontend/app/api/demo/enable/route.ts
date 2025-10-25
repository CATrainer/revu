/**
 * Next.js API Route: Enable Demo Mode
 * 
 * This route acts as a proxy between the frontend and FastAPI backend.
 * It validates the user's session and forwards the request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://revu-backend-production.up.railway.app/api/v1';

export async function POST(req: NextRequest) {
  try {
    // Get access token from cookies or fallback to localStorage-based approach
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('access_token')?.value;
    
    // Fallback: Try to get from Authorization header (for current localStorage approach)
    if (!accessToken) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized', detail: 'No access token found' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    
    // Forward request to FastAPI
    const response = await fetch(`${API_URL}/demo/enable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    // Return response with same status code
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Demo enable error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', detail: 'Failed to enable demo mode' },
      { status: 500 }
    );
  }
}
