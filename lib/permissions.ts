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
  usersEdit: 'users.edit',
  usersManage: 'users.manage',
  usersStatusManage: 'users.status.manage',
  userRolesManage: 'users.roles.manage',

  artworksView: 'artworks.view',
  artworksModerate: 'artworks.moderate',
  artworksReview: 'artworks.review',
  artworksPublish: 'artworks.publish',
  artworksReject: 'artworks.reject',

  reportsView: 'reports.view',
  reportsResolve: 'reports.resolve',

  communityModerate: 'community.moderate',
  commentsModerate: 'comments.moderate',
  commentsEditAny: 'comments.edit.any',
  commentsDeleteAny: 'comments.delete.any',

  pagesManage: 'pages.manage',
  menuManage: 'menu.manage',
  categoriesManage: 'categories.manage',
  countriesManage: 'countries.manage',

  settingsView: 'settings.view',
  settingsUpdate: 'settings.update',
  settingsManage: 'settings.manage',

  logsView: 'logs.view',
  auditView: 'audit.view',
  staffManage: 'staff.manage',

  paymentsCreate: 'payments.create',
  paymentsCompleteAny: 'payments.complete.any',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_GROUP_LABELS = {
  platform: 'Platform access',
  users: 'Users and roles',
  artworks: 'Artworks',
  community: 'Community moderation',
  commerce: 'Payments',
  observability: 'Observability',
  settings: 'Settings',
} as const;

export const PERMISSION_DEFINITIONS: Array<{
  key: PermissionKey;
  label: string;
  description: string;
  group: keyof typeof PERMISSION_GROUP_LABELS;
}> = [
  {
    key: PERMISSIONS.adminAccess,
    label: 'Admin panel access',
    description: 'Open and use the admin area.',
    group: 'platform',
  },
  {
    key: PERMISSIONS.usersView,
    label: 'View users',
    description: 'Open user management pages and browse account details.',
    group: 'users',
  },
  {
    key: PERMISSIONS.usersManage,
    label: 'Manage users',
    description: 'Edit user profile details and moderation status.',
    group: 'users',
  },
  {
    key: PERMISSIONS.userRolesManage,
    label: 'Manage roles and permissions',
    description: 'Create roles, assign permissions, and change elevated access.',
    group: 'users',
  },
  {
    key: PERMISSIONS.artworksModerate,
    label: 'Moderate artworks',
    description: 'Approve, reject, reopen, and inspect protected artwork states.',
    group: 'artworks',
  },
  {
    key: PERMISSIONS.artworksReview,
    label: 'Review artworks',
    description: 'Handle review-stage workflows and public review queues.',
    group: 'artworks',
  },
  {
    key: PERMISSIONS.settingsManage,
    label: 'Manage settings',
    description: 'Change site settings and business rules.',
    group: 'settings',
  },
  {
    key: PERMISSIONS.logsView,
    label: 'View logs',
    description: 'Access audit trails, app events, and technical observability tools.',
    group: 'observability',
  },
  {
    key: PERMISSIONS.commentsModerate,
    label: 'Moderate comments',
    description: 'Hide or restore comments as staff.',
    group: 'community',
  },
  {
    key: PERMISSIONS.commentsEditAny,
    label: 'Edit any comment',
    description: 'Edit comments created by other users.',
    group: 'community',
  },
  {
    key: PERMISSIONS.commentsDeleteAny,
    label: 'Delete any comment',
    description: 'Delete comments created by other users.',
    group: 'community',
  },
  {
    key: PERMISSIONS.paymentsCreate,
    label: 'Create payments',
    description: 'Initiate Pi payment approval flows.',
    group: 'commerce',
  },
  {
    key: PERMISSIONS.paymentsCompleteAny,
    label: 'Complete any payment',
    description: 'Complete Pi payments on behalf of other users when needed.',
    group: 'commerce',
  },
];

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

export function isSystemRole(role?: string | null) {
  return isKnownRole(role);
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

export function getAllPermissionKeys(): PermissionKey[] {
  return PERMISSION_DEFINITIONS.map((item) => item.key);
}

export function getPermissionDefinition(permission: PermissionKey) {
  return PERMISSION_DEFINITIONS.find((item) => item.key === permission) || null;
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
