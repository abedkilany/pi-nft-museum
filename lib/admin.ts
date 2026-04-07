import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getCurrentAdminContextUser } from '@/lib/current-user';
import { PERMISSIONS, type PermissionKey, userHasPermission } from '@/lib/permissions';

export const ADMIN_DEVICE_REQUIRED_PATH = '/admin-session-required';

export async function requireAdminPage(permission: PermissionKey = PERMISSIONS.adminAccess) {
  const user = await getCurrentAdminContextUser();
  if (!user) {
    redirect(`${ADMIN_DEVICE_REQUIRED_PATH}?reason=secure_session_failed&returnTo=/admin`);
  }
  if (!(await userHasPermission(user, permission))) redirect('/account');
  return user;
}

export async function requireAdminApi(permission: PermissionKey = PERMISSIONS.adminAccess) {
  const user = await getCurrentAdminContextUser();
  if (!user) {
    return {
      error: NextResponse.json(
        {
          error: 'Secure admin session could not be established.',
          reason: 'SECURE_SESSION_FAILED',
          redirectUrl: `${ADMIN_DEVICE_REQUIRED_PATH}?reason=secure_session_failed&returnTo=/admin`,
        },
        { status: 401 },
      ),
    } as const;
  }
  if (!(await userHasPermission(user, permission))) {
    return { error: NextResponse.json({ error: 'You do not have permission for this action.' }, { status: 403 }) } as const;
  }
  return { user } as const;
}

export async function requireSuperadminApi() {
  const user = await getCurrentAdminContextUser();
  if (!user) {
    return {
      error: NextResponse.json(
        {
          error: 'Secure admin session could not be established.',
          reason: 'SECURE_SESSION_FAILED',
          redirectUrl: `${ADMIN_DEVICE_REQUIRED_PATH}?reason=secure_session_failed&returnTo=/admin`,
        },
        { status: 401 },
      ),
    } as const;
  }
  if (!(await userHasPermission(user, PERMISSIONS.userRolesManage))) {
    return { error: NextResponse.json({ error: 'Superadmin-level permission required.' }, { status: 403 }) } as const;
  }
  return { user } as const;
}
