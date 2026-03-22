import { NextResponse } from 'next/server';
import { getCurrentUserAccess } from '@/lib/permissions';
import { buildAdminSections } from '@/lib/admin-sections';

export async function GET() {
  const access = await getCurrentUserAccess();

  if (!access?.sessionUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (!access.isStaff) {
    return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  }

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
      sections: buildAdminSections(access.permissions),
    }
  });
}
