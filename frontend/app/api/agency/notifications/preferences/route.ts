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
      `${BACKEND_URL}/api/v1/agency/notifications/preferences`,
      { headers, cache: 'no-store' }
    );
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(error, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Agency notification preferences GET error:', error);
    return NextResponse.json(
      { detail: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();
    const body = await request.json();
    
    const response = await fetch(
      `${BACKEND_URL}/api/v1/agency/notifications/preferences`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      }
    );
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(error, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Agency notification preferences PUT error:', error);
    return NextResponse.json(
      { detail: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
