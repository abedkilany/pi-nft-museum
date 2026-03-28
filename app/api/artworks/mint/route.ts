import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/domains/auth';
import { logger } from '@/lib/domains/system';
import { syncExpiredPublicReviewWindows } from '@/lib/artwork-windows';
import { assertSameOrigin } from '@/lib/services/request';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    await syncExpiredPublicReviewWindows();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });

    const body = await request.json();
    const artworkId = Number(body.artworkId);
    if (!artworkId) return NextResponse.json({ error: 'Invalid artwork ID.' }, { status: 400 });

    logger.warn('Direct lazy mint route blocked because payment is now required', { artworkId, userId: currentUser.userId });
    return NextResponse.json({ error: 'Lazy Mint now requires the 1 Pi payment flow. Use the Lazy Mint button to continue.' }, { status: 400 });
  } catch (error) {
    logger.error('Failed to lazy mint artwork', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
