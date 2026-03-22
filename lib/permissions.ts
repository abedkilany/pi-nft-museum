import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { isStaffRole, isSuperadminRole } from '@/lib/roles';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

export const PERMISSIONS = {
  usersView: 'users.view',
  usersEdit: 'users.edit',
  usersStatusManage: 'users.status.manage',
  usersRolesManage: 'users.roles.manage',
  artworksView: 'artworks.view',
  artworksReview: 'artworks.review',
  artworksPublish: 'artworks.publish',
  artworksReject: 'artworks.reject',
  reportsView: 'reports.view',
  reportsResolve: 'reports.resolve',
  communityModerate: 'community.moderate',
  pagesManage: 'pages.manage',
  menuManage: 'menu.manage',
  categoriesManage: 'categories.manage',
  countriesManage: 'countries.manage',
  settingsView: 'settings.view',
  settingsUpdate: 'settings.update',
  logsView: 'logs.view',
  auditView: 'audit.view',
  staffManage: 'staff.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSION_DEFAULTS: Record<string, PermissionKey[]> = {
  visitor: [],
  artist_or_trader: [],
  moderator: [
    PERMISSIONS.artworksView,
    PERMISSIONS.artworksReview,
    PERMISSIONS.artworksReject,
    PERMISSIONS.reportsView,
    PERMISSIONS.reportsResolve,
    PERMISSIONS.communityModerate,
  ],
  admin: [
    PERMISSIONS.usersView,
    PERMISSIONS.usersEdit,
    PERMISSIONS.usersStatusManage,
    PERMISSIONS.artworksView,
    PERMISSIONS.artworksReview,
    PERMISSIONS.artworksPublish,
    PERMISSIONS.artworksReject,
    PERMISSIONS.reportsView,
    PERMISSIONS.reportsResolve,
    PERMISSIONS.communityModerate,
    PERMISSIONS.pagesManage,
    PERMISSIONS.menuManage,
    PERMISSIONS.categoriesManage,
    PERMISSIONS.countriesManage,
    PERMISSIONS.settingsView,
    PERMISSIONS.settingsUpdate,
  ],
  superadmin: Object.values(PERMISSIONS),
};

function uniquePermissions(values: (string | null | undefined)[]): PermissionKey[] {
  return Array.from(new Set(values.filter(Boolean))) as PermissionKey[];
}

export async function getRolePermissions(roleKey: string | null | undefined): Promise<PermissionKey[]> {
  if (!roleKey) return [];
  if (isSuperadminRole(roleKey)) return Object.values(PERMISSIONS);

  const fallback = ROLE_PERMISSION_DEFAULTS[roleKey] ?? [];

  try {
    const role = await prisma.role.findUnique({
      where: { key: roleKey },
      include: { permissions: { include: { permission: true } } },
    });

    const dbPermissions = role?.permissions?.map((entry) => entry.permission.key) ?? [];
    return uniquePermissions([...fallback, ...dbPermissions]);
  } catch {
    return fallback;
  }
}

export async function hasPermissionForRole(roleKey: string | null | undefined, permission: PermissionKey): Promise<boolean> {
  if (!roleKey) return false;
  if (isSuperadminRole(roleKey)) return true;
  const permissions = await getRolePermissions(roleKey);
  return permissions.includes(permission);
}

export async function getCurrentUserAccess() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return null;

  const permissions = await getRolePermissions(sessionUser.role);
  return {
    sessionUser,
    role: sessionUser.role,
    permissions,
    isStaff: isStaffRole(sessionUser.role),
    isSuperadmin: isSuperadminRole(sessionUser.role),
  };
}

export async function requirePermissionApi(permission: PermissionKey) {
  const access = await getCurrentUserAccess();
  if (!access?.sessionUser) {
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) } as const;
  }
  if (!access.isStaff) {
    return { error: NextResponse.json({ error: 'Staff access required.' }, { status: 403 }) } as const;
  }
  if (!(await hasPermissionForRole(access.role, permission))) {
    return { error: NextResponse.json({ error: 'You do not have permission for this action.' }, { status: 403 }) } as const;
  }
  return { user: access.sessionUser, access } as const;
}

export async function requirePermissionPage(permission: PermissionKey) {
  const access = await getCurrentUserAccess();
  if (!access?.sessionUser) redirect('/login');
  if (!access.isStaff) redirect('/account');
  if (!(await hasPermissionForRole(access.role, permission))) redirect('/admin');
  return access;
}
