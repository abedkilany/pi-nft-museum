import { cookies, headers } from 'next/headers';
import type { SessionUser } from './auth';
import { resolveAuthenticatedUserFromHeaders } from './bearer-auth';
import { ADMIN_BRIDGE_COOKIE_NAME, resolveAdminBridgeToken } from './admin-bridge';

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const headerStore = await headers();
    const result = await resolveAuthenticatedUserFromHeaders(headerStore, { allowAdminBridge: true });
    if (result.user) {
      return result.user;
    }
  } catch {
    // Ignore and continue to cookie fallback.
  }

  try {
    const cookieStore = await cookies();
    const adminBridgeToken = cookieStore.get(ADMIN_BRIDGE_COOKIE_NAME)?.value?.trim();
    if (!adminBridgeToken) {
      return null;
    }
    return await resolveAdminBridgeToken(adminBridgeToken);
  } catch {
    return null;
  }
}
