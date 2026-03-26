import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/api/admin')) {
    const adminGrant = request.nextUrl.searchParams.get('admin_grant');
    if (adminGrant) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-admin-grant', adminGrant);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
