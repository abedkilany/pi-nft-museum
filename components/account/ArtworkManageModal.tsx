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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setBasePrice(String(toNumber(artwork.basePrice, 0)));
    setDiscountPercent(String(toNumber(artwork.discountPercent, 0)));
    setListingType(String(artwork.listingType || ArtworkListingType.NOT_FOR_SALE));
    setVisibility(String(artwork.visibility || ArtworkVisibility.PUBLIC));
    setSaving(false);
    setError('');
  }, [open, artwork]);

  const mintStatus = String(artwork.mintStatus || ArtworkMintStatus.UNMINTED);
  const canSell = [ArtworkMintStatus.LAZY_MINTED, ArtworkMintStatus.MINTED].includes(mintStatus as ArtworkMintStatus);

  useEffect(() => {
    if (!canSell) {
      setListingType(ArtworkListingType.NOT_FOR_SALE);
    }
  }, [canSell]);

  const finalPrice = useMemo(() => {
    const base = Math.max(0, toNumber(basePrice, 0));
    const discount = Math.min(100, Math.max(0, toNumber(discountPercent, 0)));
    const computed = base - (base * discount / 100);
    return Number.isFinite(computed) ? Math.max(0, computed) : 0;
  }, [basePrice, discountPercent]);

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 3000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 20, display: 'grid', gap: 14 }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Manage ${artwork.title}`}>
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
          <select className="input" value={listingType} onChange={(event) => setListingType(event.target.value)} disabled={!canSell}>
            <option value={ArtworkListingType.NOT_FOR_SALE}>{getArtworkListingLabel(ArtworkListingType.NOT_FOR_SALE)}</option>
            <option value={ArtworkListingType.FIXED_PRICE}>{getArtworkListingLabel(ArtworkListingType.FIXED_PRICE)}</option>
            <option value={ArtworkListingType.AUCTION}>{getArtworkListingLabel(ArtworkListingType.AUCTION)}</option>
          </select>
          {!canSell ? <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Listing stays locked to Not for sale until Lazy Mint or Mint is completed.</p> : null}
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Visibility</span>
          <select className="input" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value={ArtworkVisibility.PRIVATE}>{getArtworkVisibilityLabel(ArtworkVisibility.PRIVATE)}</option>
            <option value={ArtworkVisibility.PUBLIC}>{getArtworkVisibilityLabel(ArtworkVisibility.PUBLIC)}</option>
            <option value={ArtworkVisibility.FOLLOWERS}>{getArtworkVisibilityLabel(ArtworkVisibility.FOLLOWERS)}</option>
          </select>
        </label>

        {error ? <p style={{ margin: 0, color: '#ff8a8a' }}>{error}</p> : null}

        <div style={{ display: 'flex', justifyContent: 'end', gap: 10 }}>
          <button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="button primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}
