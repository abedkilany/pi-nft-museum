import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/domains/auth';
import { prisma } from '@/lib/domains/system';
import { callPiPaymentApi, ensurePaymentRecord, assertTestnetNetwork, logPaymentEvent } from '@/lib/domains/pi';
import { assertSameOrigin } from '@/lib/services/request';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (!(await userHasPermission(currentUser, PERMISSIONS.paymentsCreate))) {
      return NextResponse.json({ error: 'Your current role cannot make payments.' }, { status: 403 });
    }

    const body = await request.json();
    const paymentId = String(body.paymentId || '').trim();
    const artworkId = Number(body.artworkId || 0);
    const auctionId = Number(body.auctionId || 0) || undefined;
    const purpose = body.purpose === 'LAZY_MINT_FEE' ? 'LAZY_MINT_FEE' : body.purpose === 'TESTNET_MINT_FEE' ? 'TESTNET_MINT_FEE' : body.purpose === 'AUCTION_WIN' ? 'AUCTION_WIN' : 'ARTWORK_PURCHASE';

    if (!paymentId || !artworkId) {
      return NextResponse.json({ error: 'paymentId and artworkId are required.' }, { status: 400 });
    }

    const { artwork, auction } = await ensurePaymentRecord(paymentId, artworkId, currentUser.userId, purpose, auctionId);

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
        sellerUserId: artwork.currentOwnerUserId ?? artwork.artistUserId,
        amount: Number(approved?.amount || ((purpose === 'LAZY_MINT_FEE' || purpose === 'TESTNET_MINT_FEE') ? 1 : purpose === 'AUCTION_WIN' ? (auction?.winningAmount || artwork.price) : artwork.price)),
        memo: String(approved?.memo || (purpose === 'LAZY_MINT_FEE' ? `Lazy Mint fee for artwork #${artwork.id}` : purpose === 'TESTNET_MINT_FEE' ? `Testnet Mint fee for artwork #${artwork.id}` : purpose === 'AUCTION_WIN' ? `Auction payment #${auction?.id || 'unknown'} for artwork #${artwork.id}` : `Artwork purchase #${artwork.id}`)),
        network: String(approved?.network || 'Pi Testnet'),
        status: approved?.status?.developer_completed ? 'COMPLETED' : approved?.status?.developer_approved ? 'APPROVED' : 'CREATED',
        rawPayload: { ...(approved && typeof approved === 'object' ? approved : {}), localPurpose: purpose, auctionId: auction?.id || auctionId || null }
      },
      create: {
        paymentIdentifier: paymentId,
        artworkId,
        buyerUserId: currentUser.userId,
        sellerUserId: artwork.currentOwnerUserId ?? artwork.artistUserId,
        amount: Number(approved?.amount || ((purpose === 'LAZY_MINT_FEE' || purpose === 'TESTNET_MINT_FEE') ? 1 : purpose === 'AUCTION_WIN' ? (auction?.winningAmount || artwork.price) : artwork.price)),
        memo: String(approved?.memo || (purpose === 'LAZY_MINT_FEE' ? `Lazy Mint fee for artwork #${artwork.id}` : purpose === 'TESTNET_MINT_FEE' ? `Testnet Mint fee for artwork #${artwork.id}` : purpose === 'AUCTION_WIN' ? `Auction payment #${auction?.id || 'unknown'} for artwork #${artwork.id}` : `Artwork purchase #${artwork.id}`)),
        network: String(approved?.network || 'Pi Testnet'),
        status: approved?.status?.developer_completed ? 'COMPLETED' : approved?.status?.developer_approved ? 'APPROVED' : 'CREATED',
        rawPayload: { ...(approved && typeof approved === 'object' ? approved : {}), localPurpose: purpose, auctionId: auction?.id || auctionId || null }
      }
    });


    if (purpose === 'LAZY_MINT_FEE' || purpose === 'TESTNET_MINT_FEE') {
      await prisma.artworkMintExecution.upsert({
        where: { paymentIdentifier: paymentId },
        update: {
          artworkId,
          initiatedByUserId: currentUser.userId,
          executionType: purpose === 'LAZY_MINT_FEE' ? 'LAZY' : 'TESTNET',
          status: 'APPROVED',
          network: String(approved?.network || 'Pi Testnet'),
          errorMessage: null,
        },
        create: {
          artworkId,
          initiatedByUserId: currentUser.userId,
          paymentIdentifier: paymentId,
          executionType: purpose === 'LAZY_MINT_FEE' ? 'LAZY' : 'TESTNET',
          status: 'APPROVED',
          network: String(approved?.network || 'Pi Testnet'),
        }
      });
    }

    await logPaymentEvent('Pi payment approved', {
      paymentId,
      artworkId,
      buyerUserId: currentUser.userId,
      purpose,
      network: approved?.network || null
    });

    return NextResponse.json({ ok: true, payment: approved });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}