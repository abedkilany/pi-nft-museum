import { headers } from 'next/headers';
import type { SessionUser } from './auth';
import { extractBearerToken, resolvePiSessionFromToken } from './pi-session';
import { resolveAdminBridgeToken } from './admin-bridge';

async function resolveFromAppSession(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const session = await resolvePiSessionFromToken(token);
    return session?.sessionUser || null;
  } catch {
    return null;
  }
}

async function resolveFromAdminBridge(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    return await resolveAdminBridgeToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const headerStore = await headers();
    const bearerToken =
      extractBearerToken(headerStore.get('authorization')) ||
      headerStore.get('x-auth-token');

    const sessionUser = await resolveFromAppSession(bearerToken);
    if (sessionUser) return sessionUser;

    const adminBridgeToken = headerStore.get('x-admin-grant');
    return resolveFromAdminBridge(adminBridgeToken);
  } catch {
    return null;
  }
}
