'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { createPiPayment } from '@/lib/domains/pi';
import type { ArtworkAuctionDto, ArtworkViewerStateDto } from '@/lib/domains/artworks';

type AuctionViewerApiState = {
  canBid: boolean;
  canPay: boolean;
  reason: string | null;
  myHighestBid: number | null;
  isHighestBidder: boolean;
  isOutbid: boolean;
  isWinner: boolean;
};

function formatDateTime(targetIso: string | null) {
  if (!targetIso) return '—';
  return new Date(targetIso).toLocaleString();
}

function formatRemaining(targetIso: string | null, now: number) {
  if (!targetIso) return '—';
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return 'Expired';
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

const defaultViewerAuctionState: AuctionViewerApiState = {
  canBid: false,
  canPay: false,
  reason: null,
  myHighestBid: null,
  isHighestBidder: false,
  isOutbid: false,
  isWinner: false,
};

export function AuctionPanel({
  artworkId,
  title,
  currency,
  initialAuction,
  viewer,
}: {
  artworkId: number;
  title: string;
  currency: string;
  initialAuction: ArtworkAuctionDto | null | undefined;
  viewer: ArtworkViewerStateDto;
}) {
  const { status, ensurePaymentScope } = usePiAuth();
  const [auction, setAuction] = useState<ArtworkAuctionDto | null>(initialAuction ?? null);
  const [auctionViewerState, setAuctionViewerState] = useState<AuctionViewerApiState>(defaultViewerAuctionState);
  const [bidAmount, setBidAmount] = useState(initialAuction ? String(initialAuction.nextMinimumBid.toFixed(2)) : '');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const refreshState = useCallback(async (keepMessage = false) => {
    const response = await piApiFetch(`/api/auctions/state?artworkId=${artworkId}`, { method: 'GET', cache: 'no-store' }).catch(() => null);
    const payload = response ? await response.json().catch(() => null) : null;
    if (response?.ok && payload?.ok && payload?.auction) {
      setAuction(payload.auction as ArtworkAuctionDto);
      setAuctionViewerState((payload.viewerState as AuctionViewerApiState | null) ?? defaultViewerAuctionState);
      setBidAmount(String(Number(payload.auction.nextMinimumBid || 0).toFixed(2)));
      if (!keepMessage) setMessage(null);
    }
  }, [artworkId]);

  useEffect(() => {
    void refreshState();
  }, [refreshState, status]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!auction) return;
    const refreshTimer = window.setInterval(() => {
      void refreshState(true);
    }, 15000);
    return () => window.clearInterval(refreshTimer);
  }, [auction, refreshState]);

  const statusBadge = useMemo(() => {
    if (auctionViewerState.isWinner) return 'You won';
    if (auctionViewerState.isHighestBidder) return 'You are leading';
    if (auctionViewerState.isOutbid) return 'You were outbid';
    if (!viewer.authenticated) return 'Connect to bid';
    return auction?.status ?? 'Auction';
  }, [auction?.status, auctionViewerState.isHighestBidder, auctionViewerState.isOutbid, auctionViewerState.isWinner, viewer.authenticated]);

  async function handleBid() {
    if (!auctionViewerState.canBid || !auction) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await piApiFetch('/api/auctions/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId, amount: bidAmount }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Unable to place bid.');
      }
      setMessage('Bid placed successfully.');
      setAuction(payload.auction as ArtworkAuctionDto);
      await refreshState(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to place bid.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePay() {
    if (!auction || !auctionViewerState.canPay || !auction.winningAmount) return;
    try {
      setBusy(true);
      setMessage('Refreshing Pi payment permissions...');
      const authenticatedUser = await ensurePaymentScope();
      if (!authenticatedUser) throw new Error('Please reconnect with Pi before paying for the winning bid.');
      await createPiPayment(
        {
          amount: auction.winningAmount,
          memo: `Auction payment for ${title}`,
          metadata: { artworkId, auctionId: auction.id, title, mode: 'testnet', purpose: 'AUCTION_WIN' },
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            const response = await piApiFetch('/api/pi/payments/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, artworkId, auctionId: auction.id, purpose: 'AUCTION_WIN' }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error || 'Server approval failed.');
            setMessage('Payment approved. Complete it in Pi.');
          },
          onReadyForServerCompletion: async (paymentId, txid) => {
            const response = await piApiFetch('/api/pi/payments/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, txid }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error || 'Server completion failed.');
            setMessage('Auction payment completed successfully.');
            window.location.reload();
          },
          onCancel: () => setMessage('Payment cancelled.'),
          onError: (error) => setMessage(error?.message || 'Payment failed.'),
        },
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Payment failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!auction) {
    return <p style={{ margin: 0, color: 'var(--muted)' }}>Auction data is not available for this artwork yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <strong>{statusBadge}</strong>
          <span style={{ color: 'var(--muted)' }}>{auction.status}</span>
        </div>
        <p style={{ margin: 0 }}><strong>Current bid:</strong> {auction.currentBid == null ? 'No bids yet' : `${auction.currentBid.toFixed(2)} ${currency}`}</p>
        <p style={{ margin: 0 }}><strong>Next minimum bid:</strong> {auction.nextMinimumBid.toFixed(2)} {currency}</p>
        <p style={{ margin: 0 }}><strong>Your highest bid:</strong> {auctionViewerState.myHighestBid == null ? '—' : `${auctionViewerState.myHighestBid.toFixed(2)} ${currency}`}</p>
        <p style={{ margin: 0 }}><strong>Total bids:</strong> {auction.bidsCount}</p>
        <p style={{ margin: 0 }}><strong>Auction ends in:</strong> {formatRemaining(auction.endsAt, now)}</p>
        <p style={{ margin: 0, color: 'var(--muted)' }}><strong>Ends at:</strong> {formatDateTime(auction.endsAt)}</p>
        {auction.paymentDueAt ? <p style={{ margin: 0 }}><strong>Payment deadline:</strong> {formatRemaining(auction.paymentDueAt, now)} ({formatDateTime(auction.paymentDueAt)})</p> : null}
        <p style={{ margin: 0, color: 'var(--muted)' }}>Commission: {auction.commissionPercent.toFixed(2)}% · Extensions used: {auction.extendedCount || 0}</p>
      </div>

      {auctionViewerState.canBid ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Your bid ({currency})</span>
            <input className="input" type="number" min={auction.nextMinimumBid} step="0.01" value={bidAmount} onChange={(event) => setBidAmount(event.target.value)} />
          </label>
          <button className="button primary" type="button" onClick={handleBid} disabled={busy}>Place bid</button>
        </div>
      ) : null}

      {auctionViewerState.canPay ? (
        <button className="button primary" type="button" onClick={handlePay} disabled={busy}>
          {busy ? 'Opening Pi payment...' : `Pay winning bid (${Number(auction.winningAmount || 0).toFixed(2)} ${currency})`}
        </button>
      ) : null}

      {!viewer.authenticated ? <p className="form-message">Connect with Pi to join this auction.</p> : null}
      {auctionViewerState.reason ? <p className="form-message">{auctionViewerState.reason}</p> : null}
      {message ? <p className="form-message">{message}</p> : null}

      <div style={{ display: 'grid', gap: 6 }}>
        <strong>Recent bids</strong>
        {auction.bidHistory.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--muted)' }}>No bids yet.</p>
        ) : auction.bidHistory.map((bid) => (
          <div key={bid.id} className="card" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'grid', gap: 2 }}>
              <span>{bid.bidderUsername}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{formatDateTime(bid.createdAt)}</span>
            </div>
            <div style={{ display: 'grid', gap: 2, justifyItems: 'end' }}>
              <span>{bid.amount.toFixed(2)} {currency}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{bid.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
