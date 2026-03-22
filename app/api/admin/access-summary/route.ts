import { NextResponse } from 'next/server';
import { getCurrentUserAccess, PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  const access = await getCurrentUserAccess();

  if (!access?.sessionUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (!access.isStaff) {
    return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  }

  const permissions = new Set(access.permissions);

  return NextResponse.json({
    ok: true,
    user: {
      id: access.sessionUser.userId,
      username: access.sessionUser.username,
      role: access.role,
    },
    access: {
      isSuperadmin: access.isSuperadmin,
      permissions: access.permissions,
      sections: {
        moderation: permissions.has(PERMISSIONS.artworksReview) || permissions.has(PERMISSIONS.reportsView),
        members: permissions.has(PERMISSIONS.usersView),
        content: permissions.has(PERMISSIONS.pagesManage) || permissions.has(PERMISSIONS.menuManage) || permissions.has(PERMISSIONS.categoriesManage) || permissions.has(PERMISSIONS.countriesManage),
        operations: permissions.has(PERMISSIONS.settingsView) || permissions.has(PERMISSIONS.settingsUpdate) || permissions.has(PERMISSIONS.artworksPublish),
        system: permissions.has(PERMISSIONS.logsView) || permissions.has(PERMISSIONS.auditView) || permissions.has(PERMISSIONS.staffManage),
      }
    }
  });
}
