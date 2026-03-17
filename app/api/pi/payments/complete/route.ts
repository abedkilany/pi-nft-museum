import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { callPiPaymentApi, assertTestnetNetwork, logPaymentEvent } from '@/lib/pi-payments';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const paymentId = String(body.paymentId || '').trim();
    const txid = String(body.txid || '').trim();

    if (!paymentId || !txid) {
      return NextResponse.json({ error: 'paymentId and txid are required.' }, { status: 400 });
    }

    const existing = await prisma.piPayment.findUnique({ where: { paymentIdentifier: paymentId } });
    if (!existing) {
      return NextResponse.json({ error: 'Payment record not found for completion.' }, { status: 404 });
    }

    if (existing.buyerUserId !== currentUser.userId && !['admin', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'You are not allowed to complete this payment.' }, { status: 403 });
    }

    const completed = await callPiPaymentApi(`/payments/${encodeURIComponent(paymentId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ txid })
    });

    assertTestnetNetwork(completed?.network);

    await prisma.piPayment.update({
      where: { paymentIdentifier: paymentId },
      data: {
        txid,
        network: String(completed?.network || existing.network),
        status: completed?.status?.developer_completed ? 'COMPLETED' : completed?.status?.developer_approved ? 'APPROVED' : existing.status,
        rawPayload: completed,
        completedAt: completed?.status?.developer_completed ? new Date() : existing.completedAt
      }
    });

    if (completed?.status?.developer_completed) {
      await prisma.artwork.update({
        where: { id: existing.artworkId },
        data: { status: 'SOLD' }
      });
    }

    await logPaymentEvent('Pi payment completed', {
      paymentId,
      txid,
      artworkId: existing.artworkId,
      buyerUserId: currentUser.userId,
      network: completed?.network || null,
      completed: Boolean(completed?.status?.developer_completed)
    });

    return NextResponse.json({ ok: true, payment: completed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
