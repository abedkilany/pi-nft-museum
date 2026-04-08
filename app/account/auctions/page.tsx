import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/domains/auth';
import { getAuctionAnalyticsForUser } from '@/lib/auctions';

export const dynamic = 'force-dynamic';

export default async function AccountAuctionsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/account');
  const userId = currentUser?.userId;
  if (!userId) redirect('/account');

  const analytics = await getAuctionAnalyticsForUser(userId);

  return (
    <div className="page-stack">
      <section className="card surface-section">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Auction analytics</span>
            <h1>Your seller dashboard</h1>
          </div>
          <p>Track scheduled, live, and completed auctions for artworks you listed as the seller.</p>
        </div>
        <div className="account-summary-grid">
          <div className="card summary-card"><strong>Total auctions</strong><p style={{ color: 'var(--muted)' }}>{analytics.summary.totalAuctions}</p></div>
          <div className="card summary-card"><strong>Scheduled</strong><p style={{ color: 'var(--muted)' }}>{analytics.summary.scheduled}</p></div>
          <div className="card summary-card"><strong>Live</strong><p style={{ color: 'var(--muted)' }}>{analytics.summary.live}</p></div>
          <div className="card summary-card"><strong>Awaiting payment</strong><p style={{ color: 'var(--muted)' }}>{analytics.summary.paymentPending}</p></div>
          <div className="card summary-card"><strong>Total bids</strong><p style={{ color: 'var(--muted)' }}>{analytics.summary.totalBids}</p></div>
          <div className="card summary-card"><strong>Unique bidders seen</strong><p style={{ color: 'var(--muted)' }}>{analytics.summary.totalUniqueBidders}</p></div>
        </div>
        <div className="card-actions">
          <Link href="/account" className="button secondary">Back to account</Link>
          <Link href="/account/artworks" className="button secondary">Manage artworks</Link>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        {analytics.items.length === 0 ? (
          <div className="card" style={{ padding: 20 }}><p style={{ margin: 0, color: 'var(--muted)' }}>You have not listed any auctions yet.</p></div>
        ) : analytics.items.map((item) => (
          <article key={item!.id} className="card surface-section" style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>{item!.artworkTitle}</h2>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>Status: {item!.status}</p>
              </div>
              <Link href={`/artwork/${item!.artworkId}`} className="button primary">Open auction</Link>
            </div>
            <div className="account-summary-grid">
              <div className="card summary-card"><strong>Current bid</strong><p style={{ color: 'var(--muted)' }}>{item!.currentBid == null ? 'No bids yet' : `${item!.currentBid.toFixed(2)} ${item!.currency}`}</p></div>
              <div className="card summary-card"><strong>Total bids</strong><p style={{ color: 'var(--muted)' }}>{item!.bidsCount}</p></div>
              <div className="card summary-card"><strong>Unique bidders</strong><p style={{ color: 'var(--muted)' }}>{item!.uniqueBiddersCount}</p></div>
              <div className="card summary-card"><strong>Leading bidder</strong><p style={{ color: 'var(--muted)' }}>{item!.topBidderUsername || '—'}</p></div>
              <div className="card summary-card"><strong>Starts</strong><p style={{ color: 'var(--muted)' }}>{new Date(item!.startsAt).toLocaleString()}</p></div>
              <div className="card summary-card"><strong>Ends</strong><p style={{ color: 'var(--muted)' }}>{new Date(item!.endsAt).toLocaleString()}</p></div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
