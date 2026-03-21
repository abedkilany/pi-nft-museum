import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const headerStore = headers();

  return NextResponse.json({
    origin: headerStore.get('origin'),
    referer: headerStore.get('referer'),
    host: headerStore.get('host'),
    userAgent: headerStore.get('user-agent'),
    cookieNames: cookieStore.getAll().map((cookie: any) => cookie.name),
    hasAuthCookie: !!cookieStore.get('pi_nft_auth'),
    authCookieLength: cookieStore.get('pi_nft_auth')?.value?.length ?? 0,
  });
}