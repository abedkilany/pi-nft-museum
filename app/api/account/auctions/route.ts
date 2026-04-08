import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/domains/auth';
import { getAuctionAnalyticsForUser } from '@/lib/auctions';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.userId) {
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  }

  const analytics = await getAuctionAnalyticsForUser(currentUser.userId);
  return NextResponse.json({ ok: true, analytics });
}
