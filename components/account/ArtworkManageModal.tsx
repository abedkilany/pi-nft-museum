'use client';

import { useEffect, useMemo, useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';
import { ArtworkListingType, ArtworkMintStatus, ArtworkVisibility } from '@/types/enums';
import { getArtworkListingLabel, getArtworkMintStatusLabel, getArtworkVisibilityLabel } from '@/lib/domains/artworks';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  artwork: {
    id: number;
    title: string;
    currency: string;
    basePrice?: number | string | null;
    discountPercent?: number | string | null;
    listingType?: string | null;
    visibility?: string | null;
    mintStatus?: string | null;
    auction?: {
      id: number;
      status: string;
      startsAt?: string | Date | null;
      endsAt?: string | Date | null;
      paymentDueAt?: string | Date | null;
      startingPrice?: number | string | null;
      minIncrement?: number | string | null;
      commissionPercent?: number | string | null;
      winningAmount?: number | string | null;
      extendedCount?: number | null;
    } | null;
  };
};

function toNumber(value: number | string | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ArtworkManageModal({ open, onClose, onSaved, artwork }: Props) {
  const [basePrice, setBasePrice] = useState(String(toNumber(artwork.basePrice, 0)));
  const [discountPercent, setDiscountPercent] = useState(String(toNumber(artwork.discountPercent, 0)));
  const [listingType, setListingType] = useState(String(artwork.listingType || ArtworkListingType.NOT_FOR_SALE));
  const [visibility, setVisibility] = useState(String(artwork.visibility || ArtworkVisibility.PUBLIC));
  const [auctionDurationHours, setAuctionDurationHours] = useState('72');
  const [auctionMinIncrement, setAuctionMinIncrement] = useState('1');
  const [auctionStartMode, setAuctionStartMode] = useState<'NOW' | 'SCHEDULED'>('NOW');
  const [auctionStartsAt, setAuctionStartsAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setBasePrice(String(toNumber(artwork.basePrice, 0)));
    setDiscountPercent(String(toNumber(artwork.discountPercent, 0)));
    setListingType(String(artwork.listingType || ArtworkListingType.NOT_FOR_SALE));
    setVisibility(String(artwork.visibility || ArtworkVisibility.PUBLIC));
    const existingAuction = artwork.auction;
    const existingDurationHours = existingAuction?.startsAt && existingAuction?.endsAt
      ? Math.max(1, Math.round((new Date(existingAuction.endsAt).getTime() - new Date(existingAuction.startsAt).getTime()) / (1000 * 60 * 60)))
      : 72;
    setAuctionDurationHours(String(existingDurationHours));
    setAuctionMinIncrement(String(toNumber(existingAuction?.minIncrement, 1)));
    const startsAtValue = existingAuction?.startsAt ? new Date(existingAuction.startsAt) : null;
    const shouldSchedule = Boolean(existingAuction?.status === 'SCHEDULED' && startsAtValue && startsAtValue.getTime() > Date.now());
    setAuctionStartMode(shouldSchedule ? 'SCHEDULED' : 'NOW');
    setAuctionStartsAt(shouldSchedule && startsAtValue ? new Date(startsAtValue.getTime() - startsAtValue.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
    setSaving(false);
    setError('');
  }, [open, artwork]);

  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
    };
  }, [open]);

  const mintStatus = String(artwork.mintStatus || ArtworkMintStatus.UNMINTED);
  const canSell = [ArtworkMintStatus.LAZY_MINTED, ArtworkMintStatus.MINTED].includes(mintStatus as ArtworkMintStatus);

  useEffect(() => {
    if (!canSell) {
      setListingType(ArtworkListingType.NOT_FOR_SALE);
    }
  }, [canSell]);


  const auctionLocked = ['LIVE', 'PAYMENT_PENDING'].includes(String(artwork.auction?.status || ''));

  useEffect(() => {
    if (listingType === ArtworkListingType.AUCTION) {
      setVisibility(ArtworkVisibility.PUBLIC);
    }
  }, [listingType]);

  const finalPrice = useMemo(() => {
    const base = Math.max(0, toNumber(basePrice, 0));
    const discount = Math.min(100, Math.max(0, toNumber(discountPercent, 0)));
    const computed = base - (base * discount / 100);
    return Number.isFinite(computed) ? Math.max(0, computed) : 0;
  }, [basePrice, discountPercent]);


  const auctionEndsPreview = useMemo(() => {
    const hours = Math.max(1, toNumber(auctionDurationHours, 72));
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }, [auctionDurationHours]);

  const auctionIncrementValue = useMemo(() => Math.max(0.01, toNumber(auctionMinIncrement, 1)), [auctionMinIncrement]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const response = await piApiFetch('/api/account/artworks/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: artwork.id,
          basePrice,
          discountPercent,
          listingType,
          visibility,
          auctionDurationHours,
          auctionMinIncrement,
          auctionStartMode,
          auctionStartsAt: auctionStartMode === 'SCHEDULED' ? auctionStartsAt : null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to save artwork settings.');
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save artwork settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 3000,
        padding: 16,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: 'calc(100dvh - 32px)',
          padding: 20,
          display: 'grid',
          gap: 14,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Manage ${artwork.title}`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: '0 0 4px' }}>Manage artwork</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{artwork.title}</p>
          </div>
          <button type="button" className="button secondary" onClick={onClose}>Close</button>
        </div>

        <div className="card" style={{ padding: 12, display: 'grid', gap: 6 }}>
          <p style={{ margin: 0 }}><strong>Mint status:</strong> {getArtworkMintStatusLabel(mintStatus)}</p>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Lazy Mint is currently the live off-chain path. On-chain Mint will be enabled later when Pi Network tooling is ready.</p>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Base price ({artwork.currency})</span>
          <input className="input" type="number" min="0" step="0.01" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Discount (%)</span>
          <input className="input" type="number" min="0" max="100" step="0.01" value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} />
        </label>

        <div className="card" style={{ padding: 12 }}>
          <strong>Final price</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{finalPrice.toFixed(2)} {artwork.currency}</p>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Listing type</span>
          <select className="input" value={listingType} onChange={(event) => setListingType(event.target.value)} disabled={!canSell || auctionLocked}>
            <option value={ArtworkListingType.NOT_FOR_SALE}>{getArtworkListingLabel(ArtworkListingType.NOT_FOR_SALE)}</option>
            <option value={ArtworkListingType.FIXED_PRICE}>{getArtworkListingLabel(ArtworkListingType.FIXED_PRICE)}</option>
            <option value={ArtworkListingType.AUCTION}>{getArtworkListingLabel(ArtworkListingType.AUCTION)}</option>
          </select>
          {!canSell ? <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Listing stays locked to Not for sale until Lazy Mint or Mint is completed.</p> : null}
          {auctionLocked ? <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Listing type is locked while the auction is live or waiting for payment.</p> : null}
        </label>


        {listingType === ArtworkListingType.AUCTION ? (
          <div className="card" style={{ padding: 12, display: 'grid', gap: 12 }}>
            <strong>Auction setup</strong>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              The final price above becomes the opening bid. Buyers place bids without payment, then only the winner pays within the admin-defined payment window.
            </p>

            <label style={{ display: 'grid', gap: 6 }}>
              <span>Auction start</span>
              <select className="input" value={auctionStartMode} onChange={(event) => setAuctionStartMode(event.target.value as 'NOW' | 'SCHEDULED')} disabled={auctionLocked}>
                <option value="NOW">Start immediately</option>
                <option value="SCHEDULED">Schedule for later</option>
              </select>
            </label>

            {auctionStartMode === 'SCHEDULED' ? (
              <label style={{ display: 'grid', gap: 6 }}>
                <span>Start date & time</span>
                <input className="input" type="datetime-local" value={auctionStartsAt} onChange={(event) => setAuctionStartsAt(event.target.value)} disabled={auctionLocked} />
              </label>
            ) : null}

            <label style={{ display: 'grid', gap: 6 }}>
              <span>Auction duration (hours)</span>
              <input className="input" type="number" min="1" step="1" value={auctionDurationHours} onChange={(event) => setAuctionDurationHours(event.target.value)} />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span>Minimum bid increment ({artwork.currency})</span>
              <input className="input" type="number" min="0.01" step="0.01" value={auctionMinIncrement} onChange={(event) => setAuctionMinIncrement(event.target.value)} />
            </label>

            <div style={{ display: 'grid', gap: 4, color: 'var(--muted)', fontSize: 14 }}>
              <span>Opening bid: <strong style={{ color: 'var(--text)' }}>{finalPrice.toFixed(2)} {artwork.currency}</strong></span>
              <span>Next minimum bid after the first bid: <strong style={{ color: 'var(--text)' }}>{(finalPrice + auctionIncrementValue).toFixed(2)} {artwork.currency}</strong></span>
              <span>Expected start time: <strong style={{ color: 'var(--text)' }}>{auctionStartMode === 'SCHEDULED' && auctionStartsAt ? new Date(auctionStartsAt).toLocaleString() : 'Immediately after save'}</strong></span>
              <span>Expected end time: <strong style={{ color: 'var(--text)' }}>{(auctionStartMode === 'SCHEDULED' && auctionStartsAt ? new Date(new Date(auctionStartsAt).getTime() + Math.max(1, toNumber(auctionDurationHours, 72)) * 60 * 60 * 1000) : auctionEndsPreview).toLocaleString()}</strong></span>
              {artwork.auction ? <span>Current auction status: <strong style={{ color: 'var(--text)' }}>{artwork.auction.status}</strong></span> : null}
            </div>
          </div>
        ) : null}

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Visibility</span>
          <select className="input" value={visibility} onChange={(event) => setVisibility(event.target.value)} disabled={listingType === ArtworkListingType.AUCTION || auctionLocked}>
            <option value={ArtworkVisibility.PRIVATE}>{getArtworkVisibilityLabel(ArtworkVisibility.PRIVATE)}</option>
            <option value={ArtworkVisibility.PUBLIC}>{getArtworkVisibilityLabel(ArtworkVisibility.PUBLIC)}</option>
            <option value={ArtworkVisibility.FOLLOWERS}>{getArtworkVisibilityLabel(ArtworkVisibility.FOLLOWERS)}</option>
          </select>
        </label>

        {listingType === ArtworkListingType.AUCTION ? <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Auction artworks are always forced to Public visibility.</p> : null}
        {error ? <p style={{ margin: 0, color: '#ff8a8a' }}>{error}</p> : null}

        <div style={{ display: 'flex', justifyContent: 'end', gap: 10 }}>
          <button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="button primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}
