import { NextResponse } from 'next/server';
import { getAuthCookieName } from '@/lib/auth';

export async function POST(request: Request) {
  const secureCookie = (request.headers.get('origin') || '').startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set(getAuthCookieName(), '', {
    httpOnly: true,
    sameSite: secureCookie ? 'none' : 'lax',
    secure: secureCookie,
    path: '/',
    maxAge: 0
  });
  return response;
}
