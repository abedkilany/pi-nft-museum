import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS, isSystemRole } from '@/lib/permissions';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireAdminApi(PERMISSIONS.userRolesManage);
  if ('error' in admin) return admin.error;

  const rateLimitError = applyRateLimit(request, [admin.user.userId], 'admin-role-delete', [
    { limit: 10, windowMs: 10 * 60 * 1000 },
    { limit: 20, windowMs: 60 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const formData = await request.formData();
  const roleId = Number(formData.get('roleId'));

  if (!roleId) {
    return NextResponse.redirect(new URL('/admin/roles?error=missing-fields', request.url));
  }

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  if (!role) {
    return NextResponse.redirect(new URL('/admin/roles?error=not-found', request.url));
  }

  if (isSystemRole(role.key)) {
    return NextResponse.redirect(new URL('/admin/roles?error=cannot-delete-system-role', request.url));
  }

  if (role._count.users > 0) {
    return NextResponse.redirect(new URL('/admin/roles?error=role-has-users', request.url));
  }

  await prisma.role.delete({ where: { id: role.id } });

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_ROLE_DELETED',
    targetType: 'ROLE',
    targetId: role.id,
    oldValues: { key: role.key, name: role.name },
  });

  logger.info('Admin deleted role', { adminUserId: admin.user.userId, roleId: role.id, roleKey: role.key });
  return NextResponse.redirect(new URL('/admin/roles?deleted=1', request.url));
}
