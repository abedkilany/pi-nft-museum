import { headers } from 'next/headers';
import { type SessionUser } from './auth';
import { extractBearerToken, resolvePiSessionFromToken } from './pi-session';

export async function getCurrentUser(): Promise<SessionUser | null> {
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
