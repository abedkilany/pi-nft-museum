import { requireAdminApi } from '@/lib/domains/admin';
import { NextResponse } from 'next/server';
import { reconcileEligibleAuctions, serializeAuction } from '@/lib/auctions';

export async function POST() {
  try {
    const admin = await requireAdminApi();
    if ('error' in admin) return admin.error;
    const auctions = await reconcileEligibleAuctions();
    return NextResponse.json({ ok: true, processed: auctions.length, auctions: auctions.map(serializeAuction) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
