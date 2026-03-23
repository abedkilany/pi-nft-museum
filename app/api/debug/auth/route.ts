import { NextResponse } from 'next/server';
import { getCurrentUserAccess } from '@/lib/permissions';
import { explainPermissions } from '@/lib/debug-diagnostics';

export async function GET() {
  const access = await getCurrentUserAccess();

  if (!access?.sessionUser) {
    return NextResponse.json({
      ok: false,
      severity: 'error',
      title: 'الجلسة غير معروفة',
      summary: 'السيرفر لم يتعرف على المستخدم الحالي من التوكن المرسل.',
      nextStep: 'أعد تسجيل الدخول ثم جرّب من جديد.',
    }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    severity: access.isStaff ? 'ok' : 'warning',
    title: access.isStaff ? 'تم التعرف على الجلسة بنجاح' : 'تم التعرف على المستخدم لكن بدون صلاحيات إدارة',
    summary: access.isStaff
      ? 'المستخدم الحالي معروف لدى السيرفر، ويمكن فحص صلاحياته بدقة.'
      : 'المستخدم الحالي معروف، لكن حسابه لا يعتبر من فريق الإدارة.',
    user: {
      id: access.sessionUser.userId,
      username: access.sessionUser.username,
      role: access.role,
      isStaff: access.isStaff,
      isSuperadmin: access.isSuperadmin,
      permissionsCount: access.permissions.length,
    },
    permissionsReview: explainPermissions(access.permissions),
  });
}
