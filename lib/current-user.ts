import { headers } from 'next/headers';
import type { SessionUser } from './auth';
import { resolveAuthenticatedUserFromHeaders } from './bearer-auth';
import { resolveAdminSessionFromCookieHeader } from './admin-session';

type HeaderReader = {
  get(name: string): string | null;
};

export type CurrentUserOptions = {
  allowAdminBridge?: boolean;
};

export async function getCurrentUserFromHeaders(
  headerStore: HeaderReader,
  options?: CurrentUserOptions,
): Promise<SessionUser | null> {
  try {
    const result = await resolveAuthenticatedUserFromHeaders(headerStore, {
      allowAdminBridge: options?.allowAdminBridge ?? false,
    });
    return result.user;
  } catch {
    return null;
  }
}

export async function getCurrentUser(options?: CurrentUserOptions): Promise<SessionUser | null> {
  try {
    const headerStore = await headers();
    return getCurrentUserFromHeaders(headerStore, options);
  } catch {
    return null;
  }
}

export async function getCurrentAdminContextUser(): Promise<SessionUser | null> {
  try {
    const headerStore = await headers();
    const adminSession = await resolveAdminSessionFromCookieHeader(headerStore.get('cookie'));
    return adminSession?.sessionUser ?? null;
  } catch {
    return null;
  }
}
