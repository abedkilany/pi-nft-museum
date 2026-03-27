import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { requireAdminApi } from '@/lib/domains/admin';
import { PERMISSIONS, isSystemRole } from '@/lib/permissions';
import { assertSameOrigin, applyRateLimit } from '@/lib/services/request';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/domains/system';
import { can } from '@/lib/policy';


function rolesRedirect(request: Request, query: string) {
  const url = new URL(`/admin/roles?${query}`, request.url);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireAdminApi(PERMISSIONS.userRolesManage);
  if ('error' in admin) return admin.error;
  if (!(await can(admin.user, PERMISSIONS.userRolesManage))) {
    return NextResponse.json({ error: 'You do not have permission for this action.' }, { status: 403 });
  }

  const rateLimitError = applyRateLimit(request, [admin.user.userId], 'admin-role-delete', [
    { limit: 10, windowMs: 10 * 60 * 1000 },
    { limit: 20, windowMs: 60 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const formData = await request.formData();
  const roleId = Number(formData.get('roleId'));

  if (!roleId) {
    return rolesRedirect(request, 'error=missing-fields');
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
    return rolesRedirect(request, 'error=not-found');
  }

  if (isSystemRole(role.key)) {
    return rolesRedirect(request, 'error=cannot-delete-system-role');
  }

  if (role._count.users > 0) {
    return rolesRedirect(request, 'error=role-has-users');
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
  return rolesRedirect(request, 'deleted=1');
}
