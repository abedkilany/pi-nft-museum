import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { AUCTION_STATUS, reconcileEligibleAuctions, serializeAuction } from '@/lib/auctions';
import { getDisplayImageUrl } from '@/lib/image-url';

export const dynamic = 'force-dynamic';

export default async function AuctionPage() {
  await reconcileEligibleAuctions();

  const openAuctions = await prisma.auction.findMany({
    where: { status: { in: [AUCTION_STATUS.SCHEDULED, AUCTION_STATUS.LIVE, AUCTION_STATUS.PAYMENT_PENDING] } },
    orderBy: [{ status: 'asc' }, { endsAt: 'asc' }],
    include: {
      artwork: { select: { id: true, title: true, imageUrl: true, slug: true, currency: true, status: true, mintStatus: true, visibility: true, listingType: true, artistUserId: true, currentOwnerUserId: true } },
      winner: { select: { id: true, username: true } },
      bids: { orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }], include: { bidder: { select: { id: true, username: true } } } },
    },
  });

  const items = openAuctions.map(serializeAuction).filter(Boolean);

  return (
    <div className="page-stack">
      <section className="card surface-section">
        <h1 style={{ margin: '0 0 8px' }}>Auctions</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Live and scheduled auctions with anti-sniping protection, winner payment windows, and automatic second-chance promotion when the first winner defaults.
        </p>
      </section>

      {items.length === 0 ? (
        <section className="card" style={{ padding: 20 }}>
          <p style={{ margin: 0, color: 'var(--muted)' }}>No live auctions right now.</p>
        </section>
      ) : (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {items.map((auction) => (
            <article key={auction!.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
              <Image src={getDisplayImageUrl(auction!.artworkImageUrl)} alt={auction!.artworkTitle} width={800} height={600} unoptimized style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
              <div className="surface-section" style={{ display: 'grid', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>{auction!.artworkTitle}</h2>
                <p style={{ margin: 0, color: 'var(--muted)' }}>Status: {auction!.status}{auction!.status === 'SCHEDULED' ? ` · Starts ${new Date(auction!.startsAt).toLocaleString()}` : ''}</p>
                <p style={{ margin: 0 }}><strong>Current bid:</strong> {auction!.currentBid == null ? 'No bids yet' : `${auction!.currentBid.toFixed(2)} ${auction!.currency}`}</p>
                <p style={{ margin: 0 }}><strong>Next bid:</strong> {auction!.nextMinimumBid.toFixed(2)} {auction!.currency}</p>
                <p style={{ margin: 0 }}><strong>Bid count:</strong> {auction!.bidsCount}</p>
                <p style={{ margin: 0 }}><strong>Unique bidders:</strong> {auction!.uniqueBiddersCount}</p>
                <p style={{ margin: 0 }}><strong>Extensions:</strong> {auction!.extendedCount}</p>
                <div className="card-actions" style={{ marginTop: 8 }}>
                  <Link href={`/artwork/${auction!.artworkId}`} className="button primary">View auction</Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
