import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function GET() {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${BACKEND_URL}/api/v1/agency/notifications/unread-count`,
      { headers, cache: 'no-store' }
    );
    
    if (!response.ok) {
      return NextResponse.json({ count: 0 });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Agency unread count API error:', error);
    return NextResponse.json({ count: 0 });
  }
}
