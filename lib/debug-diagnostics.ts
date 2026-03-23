import { PERMISSIONS, type PermissionKey } from '@/lib/permissions';

export type DiagnosticSeverity = 'ok' | 'warning' | 'error';

export function severityLabel(severity: DiagnosticSeverity) {
  if (severity === 'ok') return 'سليم';
  if (severity === 'warning') return 'تحذير';
  return 'خلل';
}

export function humanizeStatus(code: number) {
  if (code >= 200 && code < 300) return 'يعمل بشكل طبيعي';
  if (code === 401) return 'يحتاج تسجيل دخول';
  if (code === 403) return 'ممنوع بسبب الصلاحيات';
  if (code === 404) return 'المسار غير موجود على السيرفر';
  if (code >= 500) return 'خطأ داخلي في السيرفر';
  return 'استجابة غير متوقعة';
}

export function summarizeRouteIssue(code: number, path: string) {
  if (code >= 200 && code < 300) return `${path} يعمل بشكل طبيعي.`;
  if (code === 401) return `${path} يرفض الطلب لأن الجلسة غير معروفة أو منتهية.`;
  if (code === 403) return `${path} موجود لكنه يمنع الوصول بسبب الصلاحيات.`;
  if (code === 404) return `${path} غير منشور أو غير معروف داخل التطبيق الحالي.`;
  if (code >= 500) return `${path} موجود لكنه يفشل أثناء التنفيذ داخل السيرفر.`;
  return `${path} أعاد استجابة غير معتادة.`;
}

export function explainPermissions(permissions: string[]) {
  const checks: { key: PermissionKey; label: string }[] = [
    { key: PERMISSIONS.usersView, label: 'إدارة المستخدمين' },
    { key: PERMISSIONS.settingsUpdate, label: 'تعديل الإعدادات' },
    { key: PERMISSIONS.logsView, label: 'عرض سجلات النظام' },
    { key: PERMISSIONS.auditView, label: 'عرض سجل التدقيق' },
    { key: PERMISSIONS.staffManage, label: 'إدارة فريق الإدارة' },
  ];

  return checks.map((item) => ({
    ...item,
    granted: permissions.includes(item.key),
  }));
}

export function explainLogEntry(message: string, level: string) {
  const lower = `${message}`.toLowerCase();
  if (lower.includes('auth') || lower.includes('token')) {
    return 'يوجد حدث متعلق بتسجيل الدخول أو التوكن.';
  }
  if (lower.includes('audit')) {
    return 'يوجد حدث متعلق بسجل التدقيق أو جلب سجلاته.';
  }
  if (lower.includes('permission') || lower.includes('access')) {
    return 'يوجد حدث متعلق بالصلاحيات أو السماح بالدخول.';
  }
  if (lower.includes('prisma') || lower.includes('database') || lower.includes('neon')) {
    return 'يوجد حدث متعلق بقاعدة البيانات أو الاتصال بها.';
  }
  if (level === 'error') {
    return 'هذا خطأ فعلي ويستحق المراجعة أولاً.';
  }
  if (level === 'warn') {
    return 'هذا تحذير؛ الصفحة قد تعمل لكن مع خلل جزئي.';
  }
  return 'حدث عام مسجل لأغراض المتابعة.';
}
