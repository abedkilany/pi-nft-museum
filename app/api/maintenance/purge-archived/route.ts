import { NextResponse } from 'next/server';
import { purgeExpiredArchivedArtworks } from '@/lib/artwork-archive';
import { assertSameOrigin } from '@/lib/services/request';
import { isTokenProtectedInternalRouteAuthorized } from '@/lib/api-guards';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  if (!isTokenProtectedInternalRouteAuthorized(request, 'MAINTENANCE_API_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const deleted = await purgeExpiredArchivedArtworks();
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 }
    );
  }
}
