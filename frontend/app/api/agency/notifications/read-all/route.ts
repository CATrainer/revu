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

export async function POST() {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${BACKEND_URL}/api/v1/agency/notifications/read-all`,
      { method: 'POST', headers }
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to mark all as read' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Agency mark all as read API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
