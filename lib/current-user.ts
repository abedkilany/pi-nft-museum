import { cookies, headers } from 'next/headers';
import { type SessionUser, getAuthCookieName, verifySessionToken } from './auth';
import { extractBearerToken, resolvePiSessionFromToken } from './pi-session';

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get(getAuthCookieName())?.value;

    if (sessionToken) {
      const sessionUser = await verifySessionToken(sessionToken);
      return sessionUser || null;
    }

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
