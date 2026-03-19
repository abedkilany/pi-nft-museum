import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthCookieName } from '@/lib/auth';
import { PI_SESSION_HINT_COOKIE_NAME } from '@/lib/pi-auth-client';

const EXCLUDED_PREFIXES = [
  '/api/auth/bootstrap',
  '/api/auth/pi/login',
  '/api/auth/logout',
  '/_next',
  '/favicon',
  '/robots.txt',
  '/sitemap',
  '/validation-key.txt',
  '/public',
];

function shouldSkip(pathname: string) {
  if (pathname.includes('.')) return true;
  return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get(getAuthCookieName())?.value);
  const hasHintCookie = Boolean(request.cookies.get(PI_SESSION_HINT_COOKIE_NAME)?.value);

  if (hasSessionCookie || !hasHintCookie) {
    return NextResponse.next();
  }

  const bootstrapUrl = new URL('/api/auth/bootstrap', request.url);
  bootstrapUrl.searchParams.set('returnTo', `${pathname}${search}`);
  return NextResponse.redirect(bootstrapUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
