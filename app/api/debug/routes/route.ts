import { NextRequest, NextResponse } from 'next/server';
import { summarizeRouteIssue } from '@/lib/debug-diagnostics';
import { requirePermissionApi, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const auth = await requirePermissionApi(PERMISSIONS.logsView);
  if ('error' in auth) return auth.error;

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const authorization = request.headers.get('authorization') || '';

  const paths = [
    '/api/admin/access-summary',
    '/api/admin/dashboard',
    '/api/admin/system/logs',
    '/api/admin/system/logs?type=audit',
  ];

  const results = await Promise.all(paths.map(async (path) => {
    try {
      const response = await fetch(`${origin}${path}`, {
        headers: authorization ? { authorization } : {},
        cache: 'no-store',
      });
      return {
        path,
        status: response.status,
        ok: response.ok,
        explanation: summarizeRouteIssue(response.status, path),
      };
    } catch (error) {
      return {
        path,
        status: 0,
        ok: false,
        explanation: `${path} فشل قبل الوصول إلى السيرفر.`,
        error: error instanceof Error ? error.message : 'Unknown route check error',
      };
    }
  }));

  return NextResponse.json({
    ok: true,
    title: 'فحص المسارات الأساسية',
    summary: 'هذا الفحص يوضح إن كانت المسارات الإدارية موجودة وتستجيب فعلًا.',
    routes: results,
  });
}
