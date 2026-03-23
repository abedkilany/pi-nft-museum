import { NextResponse } from 'next/server';
import { getCurrentUserAccess, PERMISSIONS } from '@/lib/permissions';
import { buildAdminSections } from '@/lib/admin-sections';

export async function GET() {
  const access = await getCurrentUserAccess();

  if (!access?.sessionUser) {
    return NextResponse.json({
      ok: false,
      severity: 'error',
      title: 'لا يمكن تقييم لوحة الإدارة',
      summary: 'المستخدم غير معروف حاليًا، لذلك لا يمكن تحديد ما الذي يجب أن يظهر في لوحة الإدارة.',
    }, { status: 401 });
  }

  const sections = buildAdminSections(access.permissions);
  const canSeeAudit = access.isSuperadmin || access.permissions.includes(PERMISSIONS.auditView);
  const canSeeLogs = access.isSuperadmin || access.permissions.includes(PERMISSIONS.logsView);

  return NextResponse.json({
    ok: true,
    severity: access.isStaff ? 'ok' : 'warning',
    title: access.isStaff ? 'تم حساب صلاحيات الإدارة' : 'المستخدم معروف لكن ليس من فريق الإدارة',
    summary: access.isStaff
      ? 'النتيجة التالية تشرح لماذا تظهر لك بعض أقسام الأدمن أو تختفي.'
      : 'لوحة الإدارة لن تعرض الأقسام المتقدمة لأن الحساب الحالي ليس staff.',
    user: {
      id: access.sessionUser.userId,
      username: access.sessionUser.username,
      role: access.role,
      isStaff: access.isStaff,
      isSuperadmin: access.isSuperadmin,
    },
    visibility: {
      dashboard: access.isStaff,
      moderation: sections.moderation,
      members: sections.members,
      content: sections.content,
      operations: sections.operations,
      system: sections.system,
      auditTrail: canSeeAudit,
      systemLogs: canSeeLogs,
    },
    explanations: [
      { label: 'لوحة التحكم الرئيسية', result: access.isStaff ? 'ستظهر' : 'لن تظهر' },
      { label: 'قسم النظام والسجلات', result: sections.system ? 'سيظهر' : 'لن يظهر' },
      { label: 'صفحة Audit Trail', result: canSeeAudit ? 'يجب أن تعمل' : 'لن تعمل بدون صلاحية audit.view' },
    ],
  });
}
