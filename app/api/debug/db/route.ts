import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermissionApi, PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  const auth = await requirePermissionApi(PERMISSIONS.logsView);
  if ('error' in auth) return auth.error;

  try {
    const [
      usersCount,
      rolesCount,
      permissionsCount,
      rolePermissionsCount,
      auditCount,
      lastAudit,
      currentUser,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.role.count(),
      prisma.permission.count(),
      prisma.rolePermission.count(),
      prisma.auditLog.count(),
      prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.user.findUnique({
        where: { id: auth.user.userId },
        select: {
          id: true,
          username: true,
          role: { select: { key: true, name: true } },
          status: true,
          lastLoginAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      severity: 'ok',
      title: 'قاعدة البيانات متصلة وترد بشكل طبيعي',
      summary: 'الاتصال مع قاعدة البيانات ناجح، وتمت قراءة الجداول الأساسية بدون أخطاء.',
      stats: {
        usersCount,
        rolesCount,
        permissionsCount,
        rolePermissionsCount,
        auditCount,
      },
      currentUser,
      lastAudit,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      severity: 'error',
      title: 'فشل الاتصال أو القراءة من قاعدة البيانات',
      summary: 'التطبيق وصل إلى مرحلة فحص قاعدة البيانات لكنه فشل أثناء تنفيذ الاستعلام.',
      error: error instanceof Error ? error.message : 'Unknown database error',
    }, { status: 500 });
  }
}
