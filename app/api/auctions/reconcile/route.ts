import { NextResponse } from 'next/server';
import { reconcileEligibleAuctions, serializeAuction } from '@/lib/auctions';
import { requireAdminApi, PERMISSIONS } from '@/lib/domains/admin';
import { assertSameOrigin } from '@/lib/services/request';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireAdminApi(PERMISSIONS.settingsManage);
  if ('error' in admin) return admin.error;

  try {
    const auctions = await reconcileEligibleAuctions();
    return NextResponse.json({ ok: true, processed: auctions.length, auctions: auctions.map(serializeAuction) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
