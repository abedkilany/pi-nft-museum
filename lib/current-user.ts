import { headers } from 'next/headers';
import { type SessionUser } from './auth';
import { extractBearerToken, resolvePiSessionFromToken } from './pi-session';

async function resolveFromPiAccessToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const session = await resolvePiSessionFromToken(token);
    return session?.sessionUser || null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const headerStore = headers();
    const token =
      extractBearerToken(headerStore.get('authorization')) ||
      extractBearerToken(headerStore.get('x-auth-token')) ||
      headerStore.get('x-auth-token');

    return resolveFromPiAccessToken(token);
  } catch {
    return null;
  }
}
