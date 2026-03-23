import { headers } from 'next/headers';
import type { SessionUser } from './auth';
import { extractBearerToken, resolvePiSessionFromToken } from './pi-session';

type HeaderSource = {
  get(name: string): string | null;
};

async function resolveFromAppSession(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const session = await resolvePiSessionFromToken(token);
    return session?.sessionUser || null;
  } catch {
    return null;
  }
}

export async function getCurrentUserFromHeaders(headerSource: HeaderSource): Promise<SessionUser | null> {
  const token =
    extractBearerToken(headerSource.get('authorization')) ||
    headerSource.get('x-auth-token') ||
    headerSource.get('x-app-auth-token');

  return resolveFromAppSession(token);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    return getCurrentUserFromHeaders(headers());
  } catch {
    return null;
  }
}
