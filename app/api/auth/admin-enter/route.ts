import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_BRIDGE_COOKIE_NAME, resolveAdminBridgeToken } from '@/lib/admin-bridge';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const grant = request.nextUrl.searchParams.get('grant')?.trim() || '';

  if (!grant) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  const user = await resolveAdminBridgeToken(grant).catch(() => null);
  if (!user) {
    const response = NextResponse.redirect(new URL('/account', request.url));
    response.cookies.set({
      name: ADMIN_BRIDGE_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  }

  const response = NextResponse.redirect(new URL('/admin', request.url));
  response.cookies.set({
    name: ADMIN_BRIDGE_COOKIE_NAME,
    value: grant,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
