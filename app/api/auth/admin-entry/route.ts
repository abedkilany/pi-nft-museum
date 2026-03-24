import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { issueAdminBridgeToken } from '@/lib/admin-bridge';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  }

  if (!isAdminRole(currentUser.role)) {
    return NextResponse.json({ ok: false, error: 'Admin access required.' }, { status: 403 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    include: { role: true },
  });

  if (!dbUser || !isAdminRole(dbUser.role.key)) {
    return NextResponse.json({ ok: false, error: 'Admin access required.' }, { status: 403 });
  }

  const grant = await issueAdminBridgeToken({
    userId: dbUser.id,
    role: dbUser.role.key,
    piUid: dbUser.piUid,
    piUsername: dbUser.piUsername,
    sessionVersion: dbUser.sessionVersion,
    roleVersion: dbUser.roleVersion,
  });

  return NextResponse.json({
    ok: true,
    url: `/admin?admin_grant=${encodeURIComponent(grant)}`,
  });
}
