export {
  ROLE_KEYS,
  type RoleKey,
  isAdminRole,
  isMemberRole,
  normalizeRoleForRegistration,
} from '@/lib/roles';

import { ROLE_KEYS } from '@/lib/roles';
import type { RoleKey } from '@/lib/roles';

export const ADMIN_ROLE_KEYS: RoleKey[] = [ROLE_KEYS.superadmin, ROLE_KEYS.admin, ROLE_KEYS.moderator, ROLE_KEYS.reviewer];
export const MEMBER_ROLE_KEYS: RoleKey[] = [
  ROLE_KEYS.superadmin,
  ROLE_KEYS.admin,
  ROLE_KEYS.moderator,
  ROLE_KEYS.reviewer,
  ROLE_KEYS.artistOrTrader,
];
export const PUBLIC_ROLE_KEYS: RoleKey[] = [
  ROLE_KEYS.artistOrTrader,
  ROLE_KEYS.admin,
  ROLE_KEYS.superadmin,
  ROLE_KEYS.moderator,
  ROLE_KEYS.reviewer,
];
