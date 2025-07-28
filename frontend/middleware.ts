import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup')
  ) {
    return NextResponse.next();
  }

  // Check if user is trying to access dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/reviews') || 
      pathname.startsWith('/competitors') || pathname.startsWith('/automation') ||
      pathname.startsWith('/ai-assistant') || pathname.startsWith('/reports') ||
      pathname.startsWith('/settings')) {
    
    // Get auth token from cookies
    const token = request.cookies.get('access_token');
    
    if (!token) {
      // Redirect to login if no token
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // TODO: Validate token and check user access status
    // For now, we'll redirect all dashboard access to waiting area
    // In a real implementation, you'd decode the JWT and check access_status
    
    // If user is trying to access main dashboard routes and doesn't have early access,
    // redirect to waiting area
    if (pathname !== '/waiting-area' && !pathname.startsWith('/waiting-area')) {
      // This is a simplified check - in production you'd validate the JWT token
      // and check the user's access_status field
      return NextResponse.redirect(new URL('/waiting-area', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
