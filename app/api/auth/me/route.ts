import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import {
  getCrossSiteAuthCookieName,
  readAuthTokenFromCookieStore,
} from '@/lib/auth-cookie';
import { getAuthCookieName } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const names = [
    getAuthCookieName(),
    getCrossSiteAuthCookieName(),
  ];

  const presentCookies = names.filter((name) => Boolean(cookieStore.get(name)?.value));
  const token = readAuthTokenFromCookieStore(cookieStore);
  const user = await getCurrentUser();

  logger.info('Session confirmation check', {
    presentCookies,
    tokenFound: Boolean(token),
    userConfirmed: Boolean(user),
    userId: user?.userId ?? null,
  });

  return NextResponse.json({
    ok: true,
    user,
  });
}
