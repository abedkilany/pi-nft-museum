import { headers } from 'next/headers';
import type { SessionUser } from './auth';
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

async function resolveFromPiAccessTokenHeader() {
  try {
    const headerStore = headers();
    const token =
      extractBearerToken(headerStore.get('authorization')) ||
      headerStore.get('x-auth-token');

    return resolveFromPiAccessToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return resolveFromPiAccessTokenHeader();
}
