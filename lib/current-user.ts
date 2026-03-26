import { headers } from 'next/headers';
import type { SessionUser } from './auth';
import { resolveAuthenticatedUserFromHeaders, type AuthenticatedRequestResult } from './bearer-auth';

type HeaderReader = {
  get(name: string): string | null;
};

export type CurrentUserOptions = {
  allowAdminBridge?: boolean;
};

export async function resolveCurrentUserFromHeaders(
  headerStore: HeaderReader,
  options?: CurrentUserOptions,
): Promise<AuthenticatedRequestResult> {
  return resolveAuthenticatedUserFromHeaders(headerStore, {
    allowAdminBridge: options?.allowAdminBridge ?? false,
  });
}

export async function getCurrentUserFromHeaders(
  headerStore: HeaderReader,
  options?: CurrentUserOptions,
): Promise<SessionUser | null> {
  try {
    const result = await resolveCurrentUserFromHeaders(headerStore, options);
    return result.user;
  } catch {
    return null;
  }
}

export async function resolveCurrentUser(options?: CurrentUserOptions): Promise<AuthenticatedRequestResult> {
  try {
    const headerStore = await headers();
    return resolveCurrentUserFromHeaders(headerStore, options);
  } catch {
    return {
      user: null,
      source: 'none',
      reason: 'missing_bearer_token',
      hasAuthorizationHeader: false,
      hasMalformedAuthorizationHeader: false,
    };
  }
}

export async function getCurrentUser(options?: CurrentUserOptions): Promise<SessionUser | null> {
  const result = await resolveCurrentUser(options);
  return result.user;
}

export async function getCurrentAdminContextUser(): Promise<SessionUser | null> {
  return getCurrentUser({ allowAdminBridge: true });
}
