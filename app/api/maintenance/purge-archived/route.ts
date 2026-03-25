import { NextResponse } from 'next/server';
import { safeError } from '@/lib/safe-response';
import { purgeExpiredArchivedArtworks } from '@/lib/artwork-archive';
import { assertSameOrigin } from '@/lib/security';
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
    return safeError(error);
  }
}
