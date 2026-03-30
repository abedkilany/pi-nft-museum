import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/domains/auth';
import { prisma } from '@/lib/domains/system';
import { callPiPaymentApi, assertTestnetNetwork, logPaymentEvent } from '@/lib/domains/pi';
import { syncExpiredPublicReviewWindows } from '@/lib/artwork-windows';
import { performLazyMint } from '@/lib/lazy-mint-execution';
import { assertSameOrigin } from '@/lib/services/request';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';
import { ArtworkListingType, ArtworkVisibility } from '@/types/enums';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
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

    await syncExpiredPublicReviewWindows();
    const existing = await prisma.piPayment.findUnique({ where: { paymentIdentifier: paymentId } });
    if (!existing) {
      return NextResponse.json({ error: 'Payment record not found for completion.' }, { status: 404 });
    }


    const paymentPurpose = existing.memo?.startsWith('Lazy Mint fee') || (existing.rawPayload && typeof existing.rawPayload === 'object' && 'localPurpose' in (existing.rawPayload as Record<string, unknown>) && (existing.rawPayload as Record<string, unknown>).localPurpose === 'LAZY_MINT_FEE')
      ? 'LAZY_MINT_FEE'
      : 'ARTWORK_PURCHASE';

    const canCompleteAnyPayment = await userHasPermission(currentUser, PERMISSIONS.paymentsCompleteAny);
    if (existing.buyerUserId !== currentUser.userId && !canCompleteAnyPayment) {
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
        rawPayload: { ...(completed && typeof completed === 'object' ? completed : {}), localPurpose: paymentPurpose },
        completedAt: completed?.status?.developer_completed ? new Date() : existing.completedAt
      }
    });

    if (completed?.status?.developer_completed) {
      if (paymentPurpose === 'LAZY_MINT_FEE') {
        await performLazyMint({
          artworkId: existing.artworkId,
          ownerUserId: currentUser.userId,
          ownerName: currentUser.username,
          ownerWalletAddress: null,
        });
      } else {
        const artwork = await prisma.artwork.findUnique({
          where: { id: existing.artworkId },
          include: { ownership: true }
        });

        if (artwork) {
          const acquiredAt = new Date();
          await prisma.$transaction(async (tx) => {
            await tx.artwork.update({
              where: { id: existing.artworkId },
              data: {
                currentOwnerUserId: currentUser.userId,
                listingType: ArtworkListingType.NOT_FOR_SALE,
                visibility: ArtworkVisibility.PUBLIC,
              }
            });

            if (artwork.ownership) {
              await tx.artworkOwnership.update({
                where: { artworkId: existing.artworkId },
                data: {
                  currentOwnerId: currentUser.userId,
                  currentOwnerName: currentUser.username,
                  acquiredAt,
                }
              });
            } else {
              await tx.artworkOwnership.create({
                data: {
                  artworkId: existing.artworkId,
                  currentOwnerId: currentUser.userId,
                  currentOwnerName: currentUser.username,
                  acquiredAt,
                }
              });
            }

            await tx.artworkOwnershipHistory.create({
              data: {
                artworkId: existing.artworkId,
                fromOwnerId: artwork.currentOwnerUserId ?? artwork.artistUserId,
                fromOwnerName: artwork.ownership?.currentOwnerName ?? null,
                toOwnerId: currentUser.userId,
                toOwnerName: currentUser.username,
                eventType: 'PURCHASE',
                price: existing.amount,
                createdAt: acquiredAt,
              }
            });
          });
        }
      }
    }

    await logPaymentEvent('Pi payment completed', {
      paymentId,
      txid,
      artworkId: existing.artworkId,
      buyerUserId: currentUser.userId,
      purpose: paymentPurpose,
      network: completed?.network || null,
      completed: Boolean(completed?.status?.developer_completed)
    });

    if (completed?.status?.developer_completed && paymentPurpose === 'LAZY_MINT_FEE') {
      revalidatePath('/review');
      revalidatePath('/gallery');
      revalidatePath('/account/artworks');
      revalidatePath(`/artwork/${existing.artworkId}`);
    }

    return NextResponse.json({ ok: true, payment: completed, purpose: paymentPurpose });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}