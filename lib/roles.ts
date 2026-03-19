export const ADMIN_ROLES = ['superadmin', 'admin'] as const;
export const STAFF_ROLES = ['superadmin', 'admin'] as const;
export const MEMBER_ROLES = ['artist_or_trader', 'superadmin', 'admin'] as const;
export const SELF_SERVICE_ROLES = ['visitor', 'artist_or_trader'] as const;

export function isAdminRole(role?: string | null) {
  return Boolean(role && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]));
}

export function isSuperadminRole(role?: string | null) {
  return role === 'superadmin';
}

export function isMemberRole(role?: string | null) {
  return Boolean(role && MEMBER_ROLES.includes(role as (typeof MEMBER_ROLES)[number]));
}
