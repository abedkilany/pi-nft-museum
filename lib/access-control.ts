export const ROLE_KEYS = {
  superadmin: 'superadmin',
  admin: 'admin',
  moderator: 'moderator',
  artistOrTrader: 'artist_or_trader',
  visitor: 'visitor'
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const ADMIN_ROLE_KEYS: RoleKey[] = [ROLE_KEYS.superadmin, ROLE_KEYS.admin, ROLE_KEYS.moderator];
export const MEMBER_ROLE_KEYS: RoleKey[] = [ROLE_KEYS.superadmin, ROLE_KEYS.admin, ROLE_KEYS.moderator, ROLE_KEYS.artistOrTrader];
export const PUBLIC_ROLE_KEYS: RoleKey[] = [ROLE_KEYS.artistOrTrader, ROLE_KEYS.admin, ROLE_KEYS.superadmin, ROLE_KEYS.moderator];

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLE_KEYS.includes(role as RoleKey);
}

export function isMemberRole(role: string | null | undefined): boolean {
  return role === ROLE_KEYS.artistOrTrader || role === ROLE_KEYS.moderator || isAdminRole(role);
}

export function normalizeRoleForRegistration(): RoleKey {
  return ROLE_KEYS.artistOrTrader;
}
