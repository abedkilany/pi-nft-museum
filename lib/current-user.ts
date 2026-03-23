import { headers } from 'next/headers';
import type { SessionUser } from './auth';
import { resolveAuthenticatedUserFromHeaders } from './bearer-auth';

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const headerStore = await headers();
    const result = await resolveAuthenticatedUserFromHeaders(headerStore, { allowAdminBridge: true });
    return result.user;
  } catch {
    return null;
  }
}
