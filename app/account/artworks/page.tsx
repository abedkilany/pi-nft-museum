export const dynamic = 'force-dynamic';

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ResubmitArtworkButton } from '@/components/account/ResubmitArtworkButton';
import { MintArtworkButton } from '@/components/account/MintArtworkButton';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { formatDateTime, getMintWindowStatus } from '@/lib/artwork-windows';
import { getArtworkStatusLabel } from '@/lib/artwork-status';
import { DeleteArtworkButton } from '@/components/account/DeleteArtworkButton';
import { ArtworkStatusActions } from '@/components/account/ArtworkStatusActions';
import { piApiFetch } from '@/lib/pi-auth-client';

export default function MyArtworksPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await piApiFetch('/api/account/artworks', { method: 'GET', cache: 'no-store' }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;
      if (!response?.ok || !payload?.ok) {
        setError(payload?.error || 'Failed to load artworks.');
        setLoading(false);
        return;
      }
      setData(payload);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ paddingTop: '30px' }}><div className="card" style={{ padding: '24px' }}><p>Loading artworks…</p></div></div>;
  if (error) return <div style={{ paddingTop: '30px' }}><div className="card" style={{ padding: '24px' }}><p>{error}</p></div></div>;

  const artworks = data?.artworks || [];
  const reviewHours = data?.reviewHours || 48;
  const archiveMessage = data?.archiveMessage || '';

  return (
    <div style={{ paddingTop: '30px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div><span className="section-kicker">Artwork workflow</span><h1>My artworks</h1></div>
          <p>Track each piece from review to mint, publication, and archival lifecycle.</p>
        </div>
        <div className="card-actions"><Link href="/upload" className="button primary">Upload new artwork</Link></div>
        {artworks.length === 0 ? <p>You have not submitted any artworks yet.</p> : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {artworks.map((artwork: any) => {
              const mintWindowStatus = getMintWindowStatus(artwork);
              const showMintButton = mintWindowStatus === 'mint_open';
              return (
                <div key={artwork.id} className="card" style={{ padding: '18px', display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '16px', alignItems: 'start' }}>
                  <img src={artwork.imageUrl} alt={artwork.title} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '12px' }} />
                  <div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}><h3 style={{ margin: 0 }}>{artwork.title}</h3>{artwork.status === 'PREMIUM' ? <PremiumBadge /> : null}</div>
                    <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Status: <strong>{getArtworkStatusLabel(artwork.status)}</strong></p>
                    <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Category: {artwork.category?.name || 'General'}</p>
                    <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Base price: {Number(artwork.basePrice ?? artwork.price).toFixed(2)} {artwork.currency}</p><p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Discount: {Number(artwork.discountPercent ?? 0).toFixed(2)}%</p><p style={{ margin: '0 0 10px', color: 'var(--muted)' }}>Final price: {Number(artwork.price).toFixed(2)} {artwork.currency}</p>
                    {artwork.reviewNote ? <div className="card" style={{ padding: '12px', marginBottom: '10px' }}><strong>Review note</strong><p style={{ marginBottom: 0 }}>{artwork.reviewNote}</p></div> : null}
                    {['PUBLIC_REVIEW', 'MINTING'].includes(artwork.status) ? <div className="card" style={{ padding: '12px' }}><strong>Review timeline</strong><p style={{ margin: '8px 0 4px' }}>Review started: {formatDateTime(artwork.publicReviewStartedAt)}</p><p style={{ margin: '0 0 4px' }}>Mint opens: {formatDateTime(artwork.mintWindowOpensAt)}</p><p style={{ margin: 0 }}>Mint closes: {formatDateTime(artwork.mintWindowEndsAt)}</p></div> : null}
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <Link href={`/artwork/${artwork.id}`} className="button secondary">View</Link>
                    <Link href={`/account/artworks/${artwork.id}/edit`} className="button secondary">Edit</Link>
                    <ArtworkStatusActions artworkId={artwork.id} status={artwork.status} />
                    {artwork.status === 'REJECTED' ? <ResubmitArtworkButton artworkId={artwork.id} /> : null}
                    {showMintButton ? <MintArtworkButton artworkId={artwork.id} /> : null}
                    {['PUBLIC_REVIEW', 'MINTING'].includes(artwork.status) && mintWindowStatus === 'reviewing' ? <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>Mint opens after the {reviewHours}-hour public review period.</p> : null}
                    {['PUBLIC_REVIEW', 'MINTING'].includes(artwork.status) && mintWindowStatus === 'expired' ? <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>Mint window expired. This artwork will return to the configured fallback status.</p> : null}
                    {artwork.status === 'PUBLISHED' ? <Link href="/gallery" className="button primary">Open in gallery</Link> : null}
                    {artwork.status === 'PREMIUM' ? <Link href="/premium" className="button primary">Open in premium</Link> : null}
                    {artwork.status === 'ARCHIVED' ? <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>{archiveMessage}</p> : null}
                    <DeleteArtworkButton artworkId={artwork.id} title={artwork.title} archived={artwork.status === 'ARCHIVED'} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
