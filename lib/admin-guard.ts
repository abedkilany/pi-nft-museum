import { NextResponse } from 'next/server';
import { getCurrentAdminContextUser } from '@/lib/current-user';
import { PERMISSIONS, type PermissionKey, userHasPermission } from '@/lib/permissions';

export async function requireAdminJson(permission: PermissionKey = PERMISSIONS.adminAccess) {
  const currentUser = await getCurrentAdminContextUser();

  if (!currentUser || !(await userHasPermission(currentUser, permission))) {
    return {
      currentUser: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    };
  }

  return { currentUser, errorResponse: null };
}

export async function requireAdminRedirect(request: Request, fallbackPath = '/account', permission: PermissionKey = PERMISSIONS.adminAccess) {
  const currentUser = await getCurrentAdminContextUser();

  if (!currentUser || !(await userHasPermission(currentUser, permission))) {
    return {
      currentUser: null,
      errorResponse: NextResponse.redirect(new URL(fallbackPath, request.url))
    };
  }

  return { currentUser, errorResponse: null };
}
