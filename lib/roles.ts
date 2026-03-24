export {
  ROLE_KEYS,
  type RoleKey,
  PERMISSIONS,
  type PermissionKey,
  isStaffRole as isAdminRole,
  isSuperadminRole,
  isMemberRole,
  normalizeRoleForRegistration,
  getDefaultPermissionsForRole,
  hasPermissionForRole,
  hasAnyPermissionForRole,
} from '@/lib/permissions';

export const ADMIN_ROLES = ['superadmin', 'admin', 'moderator', 'reviewer'] as const;
export const STAFF_ROLES = ADMIN_ROLES;
export const MEMBER_ROLES = ['artist_or_trader', ...ADMIN_ROLES] as const;
export const SELF_SERVICE_ROLES = ['visitor', 'artist_or_trader'] as const;
