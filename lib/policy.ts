import type { SessionUser } from '@/lib/auth';
import { PERMISSIONS, type PermissionKey, userHasPermission } from '@/lib/permissions';

export async function can(user: SessionUser | null, permission: PermissionKey) {
  if (!user) return false;
  return userHasPermission(user, permission);
}

export async function canManageUser(actor: SessionUser | null, targetUserId: number) {
  if (!actor) return false;
  if (actor.userId === targetUserId) return false;
  return userHasPermission(actor, PERMISSIONS.usersManage);
}

export async function canChangeRole(actor: SessionUser | null, targetRoleKey: string) {
  if (!actor) return false;
  if (targetRoleKey === 'superadmin') {
    return userHasPermission(actor, PERMISSIONS.userRolesManage);
  }
  return userHasPermission(actor, PERMISSIONS.userRolesManage);
}
