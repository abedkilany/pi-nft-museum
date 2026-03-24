import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_BRIDGE_COOKIE_NAME } from '@/lib/admin-bridge';

function isAdminRequest(pathname: string) {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

export function middleware(request: NextRequest) {
  if (!isAdminRequest(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const adminGrantFromUrl = request.nextUrl.searchParams.get('admin_grant');
  const adminGrantFromCookie = request.cookies.get(ADMIN_BRIDGE_COOKIE_NAME)?.value || null;
  const adminGrant = adminGrantFromCookie || adminGrantFromUrl;

  if (adminGrantFromUrl && request.method === 'GET') {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete('admin_grant');

    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set({
      name: ADMIN_BRIDGE_COOKIE_NAME,
      value: adminGrantFromUrl,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });
    return response;
  }

  if (adminGrant) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-admin-grant', adminGrant);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
