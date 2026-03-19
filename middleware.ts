import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { STAFF_ROLES } from '@/lib/roles';
import { getAuthCookieName, getAuthCookieOptions, readAuthTokenFromCookieStore } from '@/lib/auth-cookie';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

function extractBearerToken(authHeader: string | null) {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

async function verifyToken(token: string | null) {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as { userId: number; username: string; email: string; role: string };
  } catch {
    return null;
  }
}

async function getSession(request: NextRequest) {
  const headerToken = extractBearerToken(request.headers.get('authorization'));
  const queryToken = request.nextUrl.searchParams.get('authToken');
  const cookieToken = readAuthTokenFromCookieStore(request.cookies);

  const token = headerToken || queryToken || cookieToken;
  const session = await verifyToken(token);

  return {
    session,
    token,
    fromQuery: Boolean(queryToken && session),
  };
}

function normalizeOrigin(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getForwardedOrigin(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!proto || !host) return null;
  return `${proto}://${host}`;
}

function getAllowedOrigins(request: NextRequest) {
  const allowed = new Set<string>();
  const add = (value?: string | null) => {
    const origin = normalizeOrigin(value);
    if (origin) allowed.add(origin);
  };

  add(request.nextUrl.origin);
  add(getForwardedOrigin(request));
  add(process.env.APP_URL);
  add(process.env.NEXT_PUBLIC_APP_URL);
  add('http://localhost:3000');
  add('http://127.0.0.1:3000');

  return allowed;
}

function isTrustedOrigin(request: NextRequest) {
  const allowedOrigins = getAllowedOrigins(request);
  const originHeader = normalizeOrigin(request.headers.get('origin'));
  const refererOrigin = normalizeOrigin(request.headers.get('referer'));

  if (originHeader && allowedOrigins.has(originHeader)) return true;
  if (refererOrigin && allowedOrigins.has(refererOrigin)) return true;

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAccount = pathname.startsWith('/account') || pathname.startsWith('/upload');
  const needsAdmin = pathname.startsWith('/admin');
  const isApiMutation = pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method);

  if (isApiMutation && !isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  if (!needsAccount && !needsAdmin) return NextResponse.next();

  const { session, token, fromQuery } = await getSession(request);
  if (!session || !token) return NextResponse.redirect(new URL('/login', request.url));
  if (needsAdmin && !STAFF_ROLES.includes(session.role as (typeof STAFF_ROLES)[number])) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-auth-token', token);
  requestHeaders.set('authorization', `Bearer ${token}`);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (fromQuery) {
    response.cookies.set(getAuthCookieName(), token, getAuthCookieOptions(request));
  }

  return response;
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*', '/upload', '/api/:path*']
};
