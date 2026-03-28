import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getCurrentAdminContextUser } from '@/lib/current-user';
import { PERMISSIONS, type PermissionKey, userHasPermission } from '@/lib/permissions';
import { isIosUserAgent } from '@/lib/pi-browser-auth';

export const ADMIN_DEVICE_REQUIRED_PATH = '/admin/device-required';

export async function isSecureAdminDevice(): Promise<boolean> {
  const headerStore = await headers();
  const userAgent = headerStore.get('user-agent') || '';
  return !isIosUserAgent(userAgent);
}

export async function requireAdminPage(permission: PermissionKey = PERMISSIONS.adminAccess) {
  if (!(await isSecureAdminDevice())) {
    redirect(ADMIN_DEVICE_REQUIRED_PATH);
  }

  const user = await getCurrentAdminContextUser();
  if (!user) redirect(ADMIN_DEVICE_REQUIRED_PATH);
  if (!(await userHasPermission(user, permission))) redirect('/account');
  return user;
}

export async function requireAdminApi(permission: PermissionKey = PERMISSIONS.adminAccess) {
  const user = await getCurrentAdminContextUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) } as const;
  }
  if (!(await userHasPermission(user, permission))) {
    return { error: NextResponse.json({ error: 'You do not have permission for this action.' }, { status: 403 }) } as const;
  }
  return { user } as const;
}

export async function requireSuperadminApi() {
  const user = await getCurrentAdminContextUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) } as const;
  }
  if (!(await userHasPermission(user, PERMISSIONS.userRolesManage))) {
    return { error: NextResponse.json({ error: 'Superadmin-level permission required.' }, { status: 403 }) } as const;
  }
  return { user } as const;
}
