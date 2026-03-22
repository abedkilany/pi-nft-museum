import { NextResponse } from 'next/server';
import { purgeExpiredArchivedArtworks } from '@/lib/artwork-archive';
import { assertSameOrigin } from '@/lib/security';

function isAuthorized(request: Request) {
  const secret = process.env.MAINTENANCE_API_SECRET || '';
  if (!secret) return false;

  const authHeader = request.headers.get('authorization') || '';
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  if (!isAuthorized(request)) {
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