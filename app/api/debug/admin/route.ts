import { NextResponse } from 'next/server';
import { buildAdminSections } from '@/lib/admin-sections';
import { getCurrentUserAccess, PERMISSIONS } from '@/lib/permissions';
import { requireDebugAccessApi } from '@/lib/debug-diagnostics';

export async function GET() {
  const auth = await requireDebugAccessApi();
  if ('error' in auth) return auth.error;

  const access = await getCurrentUserAccess();
  if (!access) {
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  }

  const permissionSet = new Set(access.permissions);

  return NextResponse.json({
    ok: true,
    diagnostics: {
      user: {
        id: access.sessionUser.userId,
        username: access.sessionUser.username,
        role: access.role,
      },
      access: {
        isStaff: access.isStaff,
        isSuperadmin: access.isSuperadmin,
        permissions: access.permissions,
        sections: buildAdminSections(access.permissions),
      },
      criticalChecks: {
        canViewUsers: permissionSet.has(PERMISSIONS.usersView),
        canUpdateSettings: permissionSet.has(PERMISSIONS.settingsUpdate),
        canViewLogs: permissionSet.has(PERMISSIONS.logsView),
        canViewAudit: permissionSet.has(PERMISSIONS.auditView),
        canManageStaff: permissionSet.has(PERMISSIONS.staffManage),
      },
    },
  });
}
