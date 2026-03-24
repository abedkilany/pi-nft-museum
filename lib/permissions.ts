import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';

export const ROLE_KEYS = {
  superadmin: 'superadmin',
  admin: 'admin',
  moderator: 'moderator',
  reviewer: 'reviewer',
  artistOrTrader: 'artist_or_trader',
  visitor: 'visitor',
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const PERMISSIONS = {
  adminAccess: 'admin.access',
  usersView: 'users.view',
  usersManage: 'users.manage',
  userRolesManage: 'user.roles.manage',
  artworksModerate: 'artworks.moderate',
  artworksReview: 'artworks.review',
  settingsManage: 'settings.manage',
  logsView: 'logs.view',
  commentsModerate: 'comments.moderate',
  commentsEditAny: 'comments.edit.any',
  commentsDeleteAny: 'comments.delete.any',
  paymentsCreate: 'payments.create',
  paymentsCompleteAny: 'payments.complete.any',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  [ROLE_KEYS.superadmin]: Object.values(PERMISSIONS),
  [ROLE_KEYS.admin]: [
    PERMISSIONS.adminAccess,
    PERMISSIONS.usersView,
    PERMISSIONS.artworksModerate,
    PERMISSIONS.artworksReview,
    PERMISSIONS.settingsManage,
    PERMISSIONS.logsView,
    PERMISSIONS.commentsModerate,
    PERMISSIONS.commentsEditAny,
    PERMISSIONS.commentsDeleteAny,
    PERMISSIONS.paymentsCreate,
    PERMISSIONS.paymentsCompleteAny,
  ],
  [ROLE_KEYS.moderator]: [
    PERMISSIONS.adminAccess,
    PERMISSIONS.artworksModerate,
    PERMISSIONS.commentsModerate,
    PERMISSIONS.commentsEditAny,
    PERMISSIONS.commentsDeleteAny,
  ],
  [ROLE_KEYS.reviewer]: [PERMISSIONS.adminAccess, PERMISSIONS.artworksReview],
  [ROLE_KEYS.artistOrTrader]: [PERMISSIONS.paymentsCreate],
  [ROLE_KEYS.visitor]: [],
};

export function isKnownRole(role?: string | null): role is RoleKey {
  return Boolean(role && Object.values(ROLE_KEYS).includes(role as RoleKey));
}

export function isStaffRole(role?: string | null) {
  return hasPermissionForRole(role, PERMISSIONS.adminAccess);
}

export function isSuperadminRole(role?: string | null) {
  return role === ROLE_KEYS.superadmin;
}

export function isMemberRole(role?: string | null) {
  return role === ROLE_KEYS.artistOrTrader || isStaffRole(role);
}

export function normalizeRoleForRegistration(): RoleKey {
  return ROLE_KEYS.artistOrTrader;
}

export function getDefaultPermissionsForRole(role?: string | null): PermissionKey[] {
  if (!isKnownRole(role)) return [];
  return DEFAULT_ROLE_PERMISSIONS[role];
}

export function hasPermissionForRole(role: string | null | undefined, permission: PermissionKey): boolean {
  return getDefaultPermissionsForRole(role).includes(permission);
}

export function hasAnyPermissionForRole(role: string | null | undefined, permissions: PermissionKey[]): boolean {
  const current = getDefaultPermissionsForRole(role);
  return permissions.some((permission) => current.includes(permission));
}

export async function getPermissionKeysForUserId(userId: number): Promise<PermissionKey[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) return [];

  const dbPermissions = user.role.permissions
    .map((entry) => entry.permission?.key)
    .filter((value): value is PermissionKey => Boolean(value));

  if (dbPermissions.length > 0) {
    return Array.from(new Set(dbPermissions));
  }

  return getDefaultPermissionsForRole(user.role.key);
}

export async function getAuthorizationSnapshot(user: SessionUser | null) {
  if (!user) {
    return {
      user: null,
      role: null,
      permissions: [] as PermissionKey[],
      canAccessAdmin: false,
    };
  }

  let permissions: PermissionKey[] = [];

  try {
    permissions = await getPermissionKeysForUserId(user.userId);
  } catch {
    permissions = getDefaultPermissionsForRole(user.role);
  }

  return {
    user,
    role: user.role,
    permissions,
    canAccessAdmin: permissions.includes(PERMISSIONS.adminAccess),
  };
}

export async function userHasPermission(user: SessionUser | null, permission: PermissionKey): Promise<boolean> {
  const authz = await getAuthorizationSnapshot(user);
  return authz.permissions.includes(permission);
}

export async function userHasAnyPermission(user: SessionUser | null, permissions: PermissionKey[]): Promise<boolean> {
  const authz = await getAuthorizationSnapshot(user);
  return permissions.some((permission) => authz.permissions.includes(permission));
}
