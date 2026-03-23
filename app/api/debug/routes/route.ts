import { NextRequest, NextResponse } from 'next/server';
import { probeSameOriginRoute, requireDebugAccessApi } from '@/lib/debug-diagnostics';

export async function GET(request: NextRequest) {
  const auth = await requireDebugAccessApi();
  if ('error' in auth) return auth.error;

  const origin = request.nextUrl.origin;
  const authorization = request.headers.get('authorization');

  const targets = [
    '/api/debug/health',
    '/api/admin/access-summary',
    '/api/admin/dashboard',
    '/api/admin/system/logs',
    '/api/admin/system/logs?type=audit',
  ];

  const results = await Promise.all(
    targets.map((path) =>
      probeSameOriginRoute({
        origin,
        path,
        authorization,
      }).catch((error) => ({
        path,
        ok: false,
        status: 0,
        contentType: null,
        bodyPreview: error instanceof Error ? error.message : 'Unknown error',
      }))
    )
  );

  return NextResponse.json({
    ok: true,
    origin,
    results,
  });
}
