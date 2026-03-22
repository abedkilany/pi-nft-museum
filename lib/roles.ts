export const ROLE_KEYS = {
  visitor: 'visitor',
  artistOrTrader: 'artist_or_trader',
  moderator: 'moderator',
  admin: 'admin',
  superadmin: 'superadmin',
} as const;

export const ADMIN_ROLES = [ROLE_KEYS.superadmin, ROLE_KEYS.admin] as const;
export const STAFF_ROLES = [ROLE_KEYS.superadmin, ROLE_KEYS.admin, ROLE_KEYS.moderator] as const;
export const MEMBER_ROLES = [ROLE_KEYS.artistOrTrader, ROLE_KEYS.moderator, ROLE_KEYS.superadmin, ROLE_KEYS.admin] as const;
export const SELF_SERVICE_ROLES = [ROLE_KEYS.visitor, ROLE_KEYS.artistOrTrader] as const;

export function isAdminRole(role?: string | null) {
  return Boolean(role && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]));
}

export function isStaffRole(role?: string | null) {
  return isAdminRole(role);
}

export function isSuperadminRole(role?: string | null) {
  return role === ROLE_KEYS.superadmin;
}

export function isMemberRole(role?: string | null) {
  return Boolean(role && MEMBER_ROLES.includes(role as (typeof MEMBER_ROLES)[number]));
}
