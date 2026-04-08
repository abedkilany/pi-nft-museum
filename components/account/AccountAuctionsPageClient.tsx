'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequirePiAuth } from '@/components/auth/RequirePiAuth';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { piApiFetch } from '@/lib/pi-auth-client';

type AnalyticsItem = {
  id: number;
  artworkId: number;
  artworkTitle: string;
  status: string;
  currentBid: number | null;
  currency: string;
  bidsCount: number;
  uniqueBiddersCount: number;
  topBidderUsername: string | null;
  startsAt: string;
  endsAt: string;
};

type AnalyticsResponse = {
  ok: true;
  analytics: {
    summary: {
      totalAuctions: number;
      scheduled: number;
      live: number;
      paymentPending: number;
      totalBids: number;
      totalUniqueBidders: number;
    };
    items: AnalyticsItem[];
  };
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function AccountAuctionsPageClient() {
  const { status } = usePiAuth();
  const [data, setData] = useState<AnalyticsResponse['analytics'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelled = false;
    async function load() {
      const response = await piApiFetch('/api/account/auctions', { method: 'GET', cache: 'no-store' }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;

      if (response?.status === 401) {
        setError('Please reconnect with Pi to open your auction dashboard.');
        setLoading(false);
        return;
      }
      if (!response?.ok || !payload?.ok || !payload?.analytics) {
        setError(payload?.error || 'Failed to load your auction dashboard.');
        setLoading(false);
        return;
      }

      setData(payload.analytics as AnalyticsResponse['analytics']);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== 'authenticated') return <RequirePiAuth loadingText="Loading auction dashboard…" />;
  if (loading) return <div className="page-stack"><section className="card surface-section"><p>Loading auction dashboard…</p></section></div>;
  if (error || !data) return <div className="page-stack"><section className="card surface-section"><p>{error || 'Unable to load your auction dashboard.'}</p></section></div>;

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
          <div className="card summary-card"><strong>Total auctions</strong><p style={{ color: 'var(--muted)' }}>{data.summary.totalAuctions}</p></div>
          <div className="card summary-card"><strong>Scheduled</strong><p style={{ color: 'var(--muted)' }}>{data.summary.scheduled}</p></div>
          <div className="card summary-card"><strong>Live</strong><p style={{ color: 'var(--muted)' }}>{data.summary.live}</p></div>
          <div className="card summary-card"><strong>Awaiting payment</strong><p style={{ color: 'var(--muted)' }}>{data.summary.paymentPending}</p></div>
          <div className="card summary-card"><strong>Total bids</strong><p style={{ color: 'var(--muted)' }}>{data.summary.totalBids}</p></div>
          <div className="card summary-card"><strong>Unique bidders seen</strong><p style={{ color: 'var(--muted)' }}>{data.summary.totalUniqueBidders}</p></div>
        </div>
        <div className="card-actions">
          <Link href="/account" className="button secondary">Back to account</Link>
          <Link href="/account/artworks" className="button secondary">Manage artworks</Link>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        {data.items.length === 0 ? (
          <div className="card" style={{ padding: 20 }}><p style={{ margin: 0, color: 'var(--muted)' }}>You have not listed any auctions yet.</p></div>
        ) : data.items.map((item) => (
          <article key={item.id} className="card surface-section" style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>{item.artworkTitle}</h2>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>Status: {item.status}</p>
              </div>
              <Link href={`/artwork/${item.artworkId}`} className="button primary">Open auction</Link>
            </div>
            <div className="account-summary-grid">
              <div className="card summary-card"><strong>Current bid</strong><p style={{ color: 'var(--muted)' }}>{item.currentBid == null ? 'No bids yet' : `${item.currentBid.toFixed(2)} ${item.currency}`}</p></div>
              <div className="card summary-card"><strong>Total bids</strong><p style={{ color: 'var(--muted)' }}>{item.bidsCount}</p></div>
              <div className="card summary-card"><strong>Unique bidders</strong><p style={{ color: 'var(--muted)' }}>{item.uniqueBiddersCount}</p></div>
              <div className="card summary-card"><strong>Leading bidder</strong><p style={{ color: 'var(--muted)' }}>{item.topBidderUsername || '—'}</p></div>
              <div className="card summary-card"><strong>Starts</strong><p style={{ color: 'var(--muted)' }}>{formatDateTime(item.startsAt)}</p></div>
              <div className="card summary-card"><strong>Ends</strong><p style={{ color: 'var(--muted)' }}>{formatDateTime(item.endsAt)}</p></div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
