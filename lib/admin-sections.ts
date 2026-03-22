import { PERMISSIONS, type PermissionKey } from '@/lib/permissions';

export type AdminSectionKey = 'moderation' | 'members' | 'content' | 'operations' | 'system';

export const ADMIN_SECTION_RULES: Record<AdminSectionKey, PermissionKey[]> = {
  moderation: [PERMISSIONS.artworksReview, PERMISSIONS.reportsView, PERMISSIONS.communityModerate],
  members: [PERMISSIONS.usersView, PERMISSIONS.usersEdit, PERMISSIONS.usersRolesManage],
  content: [PERMISSIONS.pagesManage, PERMISSIONS.menuManage, PERMISSIONS.categoriesManage, PERMISSIONS.countriesManage],
  operations: [PERMISSIONS.settingsView, PERMISSIONS.settingsUpdate, PERMISSIONS.artworksPublish],
  system: [PERMISSIONS.logsView, PERMISSIONS.auditView, PERMISSIONS.staffManage],
};

export function buildAdminSections(permissions: PermissionKey[]) {
  const granted = new Set(permissions);
  return Object.fromEntries(
    Object.entries(ADMIN_SECTION_RULES).map(([section, requiredPermissions]) => [
      section,
      requiredPermissions.some((permission) => granted.has(permission)),
    ])
  ) as Record<AdminSectionKey, boolean>;
}
