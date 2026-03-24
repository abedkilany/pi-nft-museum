import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { callPiPaymentApi, ensurePaymentRecord, assertTestnetNetwork, logPaymentEvent } from '@/lib/pi-payments';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (!['artist_or_trader', 'admin', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Your current role cannot make payments.' }, { status: 403 });
    }

    const body = await request.json();
    const paymentId = String(body.paymentId || '').trim();
    const artworkId = Number(body.artworkId || 0);

    if (!paymentId || !artworkId) {
      return NextResponse.json({ error: 'paymentId and artworkId are required.' }, { status: 400 });
    }

    const { artwork } = await ensurePaymentRecord(paymentId, artworkId, currentUser.userId);

    const approved = await callPiPaymentApi(`/payments/${encodeURIComponent(paymentId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({})
    });

    assertTestnetNetwork(approved?.network);

    await prisma.piPayment.upsert({
      where: { paymentIdentifier: paymentId },
      update: {
        artworkId,
        buyerUserId: currentUser.userId,
        sellerUserId: artwork.artistUserId,
        amount: Number(approved?.amount || artwork.price),
        memo: String(approved?.memo || `Artwork purchase #${artwork.id}`),
        network: String(approved?.network || 'Pi Testnet'),
        status: approved?.status?.developer_completed ? 'COMPLETED' : approved?.status?.developer_approved ? 'APPROVED' : 'CREATED',
        rawPayload: approved
      },
      create: {
        paymentIdentifier: paymentId,
        artworkId,
        buyerUserId: currentUser.userId,
        sellerUserId: artwork.artistUserId,
        amount: Number(approved?.amount || artwork.price),
        memo: String(approved?.memo || `Artwork purchase #${artwork.id}`),
        network: String(approved?.network || 'Pi Testnet'),
        status: approved?.status?.developer_completed ? 'COMPLETED' : approved?.status?.developer_approved ? 'APPROVED' : 'CREATED',
        rawPayload: approved
      }
    });

    await logPaymentEvent('Pi payment approved', {
      paymentId,
      artworkId,
      buyerUserId: currentUser.userId,
      network: approved?.network || null
    });

    return NextResponse.json({ ok: true, payment: approved });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}