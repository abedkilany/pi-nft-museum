import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { isAdminRole, isSuperadminRole } from '@/lib/roles';
import { PERMISSIONS, type PermissionKey, hasPermissionForRole } from '@/lib/permissions';

export async function requireAdminPage(permission: PermissionKey = PERMISSIONS.artworksView) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isAdminRole(user.role)) redirect('/account');
  if (!(await hasPermissionForRole(user.role, permission))) redirect('/admin');
  return user;
}

export async function requireAdminApi(permission: PermissionKey = PERMISSIONS.artworksView) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) } as const;
  }
  if (!isAdminRole(user.role)) {
    return { error: NextResponse.json({ error: 'Staff access required.' }, { status: 403 }) } as const;
  }
  if (!(await hasPermissionForRole(user.role, permission))) {
    return { error: NextResponse.json({ error: 'You do not have permission for this action.' }, { status: 403 }) } as const;
  }
  return { user } as const;
}

export async function requireSuperadminApi() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) } as const;
  }
  if (!isSuperadminRole(user.role)) {
    return { error: NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 }) } as const;
  }
  return { user } as const;
}
