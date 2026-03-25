import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders } from '@/lib/current-user';
import { PERMISSIONS, type PermissionKey, userHasPermission } from '@/lib/permissions';
import { isInternalDebugRouteEnabled, isProduction } from '@/lib/debug-flags';

function buildUnauthorizedResponse(reason: 'NO_SESSION_TOKEN' | 'INVALID_OR_EXPIRED_SESSION' = 'NO_SESSION_TOKEN') {
  return NextResponse.json({ ok: false, error: 'Authentication required.', reason }, { status: 401 });
}

export async function requireAuthenticatedRequest(request: Request, options?: { allowAdminBridge?: boolean }) {
  const user = await getCurrentUserFromHeaders(request.headers, {
    allowAdminBridge: options?.allowAdminBridge ?? false,
  });

  if (!user) {
    return { error: buildUnauthorizedResponse() } as const;
  }

  return { user } as const;
}

export async function requirePermissionRequest(
  request: Request,
  permission: PermissionKey,
  options?: { allowAdminBridge?: boolean }
) {
  const auth = await requireAuthenticatedRequest(request, options);
  if ('error' in auth) return auth;
  if (!(await userHasPermission(auth.user, permission))) {
    return { error: NextResponse.json({ error: 'You do not have permission for this action.' }, { status: 403 }) } as const;
  }
  return auth;
}

export async function requireAdminRequest(request: Request, options?: { allowAdminBridge?: boolean }) {
  return requirePermissionRequest(request, PERMISSIONS.adminAccess, options);
}

export async function requireSuperadminRequest(request: Request, options?: { allowAdminBridge?: boolean }) {
  return requirePermissionRequest(request, PERMISSIONS.userRolesManage, options);
}

export function requireDebugRoute() {
  if (!isInternalDebugRouteEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return null;
}

export function isTokenProtectedInternalRouteAuthorized(request: Request, envKey: 'HEALTHCHECK_SECRET' | 'MAINTENANCE_API_SECRET') {
  const secret = process.env[envKey] || '';

  if (!secret) {
    return !isProduction;
  }

  const authHeader = request.headers.get('authorization') || '';
  return authHeader === `Bearer ${secret}`;
}
