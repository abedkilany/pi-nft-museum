import type { SessionUser } from './auth';
import { resolveRequestViewer, resolveRequestViewerFromHeaders, type HeaderReader } from './request-viewer';

export type CurrentUserOptions = {
  allowAdminBridge?: boolean;
  allowBearerFallback?: boolean;
};

export async function getCurrentUserFromHeaders(
  headerStore: HeaderReader,
  options?: CurrentUserOptions,
): Promise<SessionUser | null> {
  try {
    const result = await resolveRequestViewerFromHeaders(headerStore, {
      allowAdminBridge: options?.allowAdminBridge ?? false,
      allowBearerFallback: options?.allowBearerFallback ?? true,
    });
    return result.user;
  } catch {
    return null;
  }
}

export async function getCurrentUser(options?: CurrentUserOptions): Promise<SessionUser | null> {
  try {
    const result = await resolveRequestViewer({
      allowAdminBridge: options?.allowAdminBridge ?? false,
      allowBearerFallback: options?.allowBearerFallback ?? true,
    });
    return result.user;
  } catch {
    return null;
  }
}

export async function getCurrentAdminContextUser(): Promise<SessionUser | null> {
  return getCurrentUser({ allowAdminBridge: true, allowBearerFallback: true });
}
