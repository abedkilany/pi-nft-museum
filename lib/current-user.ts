import { cookies, headers } from 'next/headers';
import { type SessionUser, getAuthCookieName, verifySessionToken } from './auth';
import { extractBearerToken, resolvePiSessionFromToken } from './pi-session';

async function resolveFromServerSessionCookie() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get(getAuthCookieName())?.value;

    if (!sessionToken) return null;

    const sessionUser = await verifySessionToken(sessionToken);
    return sessionUser || null;
  } catch {
    return null;
  }
}

async function resolveFromPiAccessTokenHeader() {
  try {
    const headerStore = headers();
    const token =
      extractBearerToken(headerStore.get('authorization')) ||
      headerStore.get('x-auth-token');

    if (!token) return null;

    const session = await resolvePiSessionFromToken(token);
    return session?.sessionUser || null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const sessionUser = await resolveFromServerSessionCookie();
  if (sessionUser) return sessionUser;

  return resolveFromPiAccessTokenHeader();
}
