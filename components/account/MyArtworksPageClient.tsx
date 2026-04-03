'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArtworkStatusActions } from '@/components/account/ArtworkStatusActions';
import { ArtworkManageModal } from '@/components/account/ArtworkManageModal';
import {
  ArtworkListingType,
  ArtworkMintStatus,
  ArtworkStatus,
  ArtworkVisibility,
} from '@/types/enums';
import { ResubmitArtworkButton } from '@/components/account/ResubmitArtworkButton';
import { MintArtworkButton } from '@/components/account/MintArtworkButton';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { formatDateTime, getMintWindowStatus } from '@/lib/artwork-windows';
import {
  getArtworkListingLabel,
  getArtworkMintStatusLabel,
  getArtworkStatusLabel,
  getArtworkVisibilityLabel,
} from '@/lib/domains/artworks';
import { DeleteArtworkButton } from '@/components/account/DeleteArtworkButton';
import { piApiFetch } from '@/lib/pi-auth-client';
import { RequirePiAuth } from '@/components/auth/RequirePiAuth';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { getDisplayImageUrl } from '@/lib/image-url';

type UserSummary = {
  id?: number | null;
  username?: string | null;
  fullName?: string | null;
  artistProfile?: { displayName?: string | null } | null;
} | null;

type MyArtworkItem = {
  id: number;
  title: string;
  imageUrl: string;
  status: string;
  mintStatus?: string | null;
  listingType?: string | null;
  visibility?: string | null;
  currentOwnerUserId?: number | null;
  artistUserId?: number | null;
  artist?: UserSummary;
  currentOwner?: UserSummary;
  category?: { name?: string | null } | null;
  currency: string;
  basePrice?: number | string | null;
  discountPercent?: number | string | null;
  price: number | string;
  reviewNote?: string | null;
  publicReviewStartedAt?: string | Date | null;
  mintWindowOpensAt?: string | Date | null;
  mintWindowEndsAt?: string | Date | null;
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

type MyArtworksResponse = {
  ok: true;
  artworks: MyArtworkItem[];
  reviewHours?: number;
  archiveMessage?: string;
  user?: { userId?: number | null; username?: string | null } | null;
};

type PrimaryTab = 'creations' | 'collection';
type CreationTab = 'draft' | 'review' | 'published' | 'premium';
type CollectionTab = 'all';

function getPersonLabel(user?: UserSummary | undefined) {
  return (
    user?.artistProfile?.displayName ||
    user?.fullName ||
    user?.username ||
    'Unknown'
  );
}

function pillButtonClass(active: boolean) {
  return active ? 'button primary' : 'button secondary';
}

function getArtworkSummary(artwork: MyArtworkItem, mintWindowStatus: string) {
  if (artwork.status === ArtworkStatus.DRAFT) {
    return 'Draft saved privately until you submit it for review.';
  }

  if (artwork.status === ArtworkStatus.PENDING_REVIEW) {
    return 'Waiting for admin review before public review starts.';
  }

  if (artwork.status === ArtworkStatus.PUBLIC_REVIEW) {
    if (mintWindowStatus === 'mint_open') {
      return 'This artwork is ready for Lazy Mint.';
    }
    if (mintWindowStatus === 'expired') {
      return 'The Lazy Mint window expired for this artwork.';
    }
    return 'This artwork is in public review.';
  }

  if (artwork.status === ArtworkStatus.PREMIUM) {
    return artwork.listingType === ArtworkListingType.FIXED_PRICE
      ? 'Premium artwork live for direct sale.'
      : artwork.listingType === ArtworkListingType.AUCTION
        ? 'Premium artwork live as an auction listing.'
        : 'Premium artwork visible without an active sale.';
  }

  if (artwork.status === ArtworkStatus.PUBLISHED) {
    return artwork.listingType === ArtworkListingType.FIXED_PRICE
      ? 'Published artwork live for direct sale.'
      : artwork.listingType === ArtworkListingType.AUCTION
        ? 'Published artwork live as an auction listing.'
        : 'Published artwork visible without an active sale.';
  }

  if (artwork.status === ArtworkStatus.REJECTED) {
    return 'Review was rejected. You can edit and resubmit this artwork.';
  }

  if (artwork.status === ArtworkStatus.ARCHIVED) {
    return 'This artwork is archived.';
  }

  return 'Artwork details';
}

function ManagedArtworkCard({
  artwork,
  mintWindowStatus,
  reviewHours,
  archiveMessage,
  showMintButton,
  canManage,
  currentUserId,
  showCreatorMeta,
  showOwnerMeta,
  loadArtworks,
}: {
  artwork: MyArtworkItem;
  mintWindowStatus: string;
  reviewHours: number;
  archiveMessage: string;
  showMintButton: boolean;
  canManage: boolean;
  currentUserId: number | null;
  showCreatorMeta: boolean;
  showOwnerMeta: boolean;
  loadArtworks: () => Promise<void>;
}) {
  const [manageOpen, setManageOpen] = useState(false);

  const ownerUserId = artwork.currentOwnerUserId ?? artwork.artistUserId ?? null;
  const isOwner = ownerUserId === currentUserId;
  const artistName = getPersonLabel(artwork.artist);
  const ownerName =
    ownerUserId === currentUserId ? 'You' : getPersonLabel(artwork.currentOwner);
  const summary = getArtworkSummary(artwork, mintWindowStatus);

  return (
    <>
      <div className="card my-artwork-item">
        <Image
          src={getDisplayImageUrl(artwork.imageUrl)}
          alt={artwork.title}
          width={800}
          height={600}
          unoptimized
          className="my-artwork-thumb"
        />

        <div>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '8px',
            }}
          >
            <h3 style={{ margin: 0 }}>{artwork.title}</h3>
            {artwork.status === ArtworkStatus.PREMIUM ? <PremiumBadge /> : null}
          </div>

          <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>{summary}</p>
          <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>
            Status: <strong>{getArtworkStatusLabel(artwork.status)}</strong>
          </p>
          <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>
            Mint:{' '}
            <strong>
              {getArtworkMintStatusLabel(
                artwork.mintStatus || ArtworkMintStatus.UNMINTED,
              )}
            </strong>
          </p>
          <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>
            Sale:{' '}
            <strong>
              {getArtworkListingLabel(
                artwork.listingType || ArtworkListingType.NOT_FOR_SALE,
              )}
            </strong>
          </p>
          <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>
            Visibility:{' '}
            <strong>
              {getArtworkVisibilityLabel(
                artwork.visibility || ArtworkVisibility.PRIVATE,
              )}
            </strong>
          </p>

          {showCreatorMeta ? (
            <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>
              Creator: {artistName}
            </p>
          ) : null}

          {showOwnerMeta ? (
            <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>
              Owner: {ownerName}
            </p>
          ) : null}

          <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>
            Category: {artwork.category?.name || 'General'}
          </p>
          <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>
            Base price: {Number(artwork.basePrice ?? artwork.price).toFixed(2)}{' '}
            {artwork.currency}
          </p>
          <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>
            Discount: {Number(artwork.discountPercent ?? 0).toFixed(2)}%
          </p>
          <p style={{ margin: '0 0 10px', color: 'var(--muted)' }}>
            Final price: {Number(artwork.price).toFixed(2)} {artwork.currency}
          </p>

          {artwork.reviewNote ? (
            <div className="card" style={{ padding: '12px', marginBottom: '10px' }}>
              <strong>Review note</strong>
              <p style={{ marginBottom: 0 }}>{artwork.reviewNote}</p>
            </div>
          ) : null}

          {artwork.status === ArtworkStatus.PUBLIC_REVIEW ? (
            <div className="card" style={{ padding: '12px' }}>
              <strong>Review timeline</strong>
              <p style={{ margin: '8px 0 4px' }}>
                Review started: {formatDateTime(artwork.publicReviewStartedAt)}
              </p>
              <p style={{ margin: '0 0 4px' }}>
                Lazy mint opens: {formatDateTime(artwork.mintWindowOpensAt)}
              </p>
              <p style={{ margin: 0 }}>
                Lazy mint closes: {formatDateTime(artwork.mintWindowEndsAt)}
              </p>
            </div>
          ) : null}
        </div>

        <div className="my-artwork-actions">
          <Link href={`/artwork/${artwork.id}`} className="button secondary">
            View
          </Link>

          {artwork.status === ArtworkStatus.DRAFT ? (
            <Link
              href={`/account/artworks/${artwork.id}/edit`}
              className="button secondary"
            >
              Edit
            </Link>
          ) : null}

          <ArtworkStatusActions artworkId={artwork.id} status={artwork.status} />

          {artwork.status === ArtworkStatus.REJECTED ? (
            <ResubmitArtworkButton artworkId={artwork.id} />
          ) : null}

          {showMintButton ? (
            <MintArtworkButton
              artworkId={artwork.id}
              title={artwork.title}
              onMinted={loadArtworks}
            />
          ) : null}

          {canManage ? (
            <button
              type="button"
              className="button secondary"
              onClick={() => setManageOpen(true)}
            >
              Manage
            </button>
          ) : null}

          {artwork.status === ArtworkStatus.PUBLIC_REVIEW &&
          mintWindowStatus === 'reviewing' ? (
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
              Lazy Mint opens after the {reviewHours}-hour public review period.
            </p>
          ) : null}

          {artwork.status === ArtworkStatus.PUBLIC_REVIEW &&
          mintWindowStatus === 'expired' ? (
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
              Lazy mint window expired. This artwork will return to the configured
              fallback status.
            </p>
          ) : null}

          {artwork.status === ArtworkStatus.PUBLISHED &&
          artwork.visibility === ArtworkVisibility.PUBLIC ? (
            <>
              <Link href="/gallery" className="button primary">
                Open in gallery
              </Link>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                {artwork.listingType === ArtworkListingType.FIXED_PRICE
                  ? 'This artwork is live for direct sale.'
                  : artwork.listingType === ArtworkListingType.AUCTION
                    ? 'This artwork is visible as an auction listing.'
                    : 'This artwork is public but not for sale.'}
              </p>
            </>
          ) : null}

          {artwork.status === ArtworkStatus.PREMIUM &&
          artwork.visibility === ArtworkVisibility.PUBLIC ? (
            <Link href="/premium" className="button primary">
              Open in premium
            </Link>
          ) : null}

          {artwork.status === ArtworkStatus.ARCHIVED ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
              {archiveMessage}
            </p>
          ) : null}

          {!isOwner && showOwnerMeta ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
              This artwork is currently owned by {ownerName}.
            </p>
          ) : null}

          <DeleteArtworkButton
            artworkId={artwork.id}
            title={artwork.title}
            archived={artwork.status === ArtworkStatus.ARCHIVED}
          />
        </div>
      </div>

      {canManage ? (
        <ArtworkManageModal
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          onSaved={loadArtworks}
          artwork={artwork}
        />
      ) : null}
    </>
  );
}

export default function MyArtworksPageClient() {
  const { status } = usePiAuth();

  const [data, setData] = useState<MyArtworksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('creations');
  const [creationTab, setCreationTab] = useState<CreationTab>('draft');
  const [collectionTab, setCollectionTab] = useState<CollectionTab>('all');

  async function loadArtworks() {
    const response = await piApiFetch('/api/account/artworks', {
      method: 'GET',
      cache: 'no-store',
    }).catch(() => null);

    const payload = response ? await response.json().catch(() => null) : null;

    if (response?.status === 401) {
      setError('Please reconnect with Pi to load your artworks.');
      setLoading(false);
      return;
    }

    if (!response?.ok || !payload?.ok) {
      setError(payload?.error || 'Failed to load artworks.');
      setLoading(false);
      return;
    }

    setError('');
    setData(payload);
    setLoading(false);
  }

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    setLoading(true);
    void loadArtworks();
  }, [status]);

  const artworks = useMemo(() => data?.artworks ?? [], [data]);
  const reviewHours = data?.reviewHours ?? 48;
  const archiveMessage = data?.archiveMessage ?? '';
  const username = data?.user?.username ?? null;
  const currentUserId = data?.user?.userId ?? null;

  const creations = useMemo(
    () => artworks.filter((artwork) => artwork.artistUserId === currentUserId),
    [artworks, currentUserId],
  );

  const collection = useMemo(
    () =>
      artworks.filter(
        (artwork) =>
          (artwork.currentOwnerUserId ?? artwork.artistUserId ?? null) ===
          currentUserId,
      ),
    [artworks, currentUserId],
  );

  const visibleCreations = useMemo(() => {
    switch (creationTab) {
      case 'draft':
        return creations.filter(
          (artwork) =>
            artwork.status === ArtworkStatus.DRAFT ||
            artwork.status === ArtworkStatus.REJECTED,
        );

      case 'review':
        return creations.filter((artwork) =>
          [
            ArtworkStatus.PENDING_REVIEW,
            ArtworkStatus.PUBLIC_REVIEW,
          ].includes(artwork.status as ArtworkStatus),
        );

      case 'published':
        return creations.filter(
          (artwork) => artwork.status === ArtworkStatus.PUBLISHED,
        );

      case 'premium':
        return creations.filter(
          (artwork) => artwork.status === ArtworkStatus.PREMIUM,
        );

      default:
        return creations;
    }
  }, [creationTab, creations]);

  const visibleCollection = useMemo(() => {
    switch (collectionTab) {
      case 'all':
      default:
        return collection;
    }
  }, [collection, collectionTab]);

  const creationCounts = useMemo(
    () => ({
      draft: creations.filter(
        (artwork) =>
          artwork.status === ArtworkStatus.DRAFT ||
          artwork.status === ArtworkStatus.REJECTED,
      ).length,
      review: creations.filter((artwork) =>
        [
          ArtworkStatus.PENDING_REVIEW,
          ArtworkStatus.PUBLIC_REVIEW,
        ].includes(artwork.status as ArtworkStatus),
      ).length,
      published: creations.filter(
        (artwork) => artwork.status === ArtworkStatus.PUBLISHED,
      ).length,
      premium: creations.filter(
        (artwork) => artwork.status === ArtworkStatus.PREMIUM,
      ).length,
    }),
    [creations],
  );

  const activeItems =
    primaryTab === 'creations' ? visibleCreations : visibleCollection;

  if (status !== 'authenticated') {
    return <RequirePiAuth loadingText="Loading your artworks…" />;
  }

  if (loading) {
    return (
      <div className="page-stack">
        <div className="card surface-section">
          <p>Loading artworks…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <div className="card surface-section">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="card surface-section">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Artwork workflow</span>
            <h1>My artworks</h1>
          </div>
          <p>
            Track your creations, manage sales, and review artworks you currently
            own.
          </p>
        </div>

        <div className="card-actions">
          <Link href="/upload" className="button primary">
            Upload new artwork
          </Link>
          <Link
            href={username ? `/profile/${username}` : '/account'}
            prefetch={false}
            className="button secondary"
          >
            Open profile
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button
            type="button"
            className={pillButtonClass(primaryTab === 'creations')}
            onClick={() => setPrimaryTab('creations')}
          >
            Creations
          </button>
          <button
            type="button"
            className={pillButtonClass(primaryTab === 'collection')}
            onClick={() => setPrimaryTab('collection')}
          >
            Collection
          </button>
        </div>

        {primaryTab === 'creations' ? (
          <>
            <div
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}
            >
              <button
                type="button"
                className={pillButtonClass(creationTab === 'draft')}
                onClick={() => setCreationTab('draft')}
              >
                Draft {creationCounts.draft ? `(${creationCounts.draft})` : ''}
              </button>
              <button
                type="button"
                className={pillButtonClass(creationTab === 'review')}
                onClick={() => setCreationTab('review')}
              >
                Review {creationCounts.review ? `(${creationCounts.review})` : ''}
              </button>
              <button
                type="button"
                className={pillButtonClass(creationTab === 'published')}
                onClick={() => setCreationTab('published')}
              >
                Published{' '}
                {creationCounts.published ? `(${creationCounts.published})` : ''}
              </button>
              <button
                type="button"
                className={pillButtonClass(creationTab === 'premium')}
                onClick={() => setCreationTab('premium')}
              >
                Premium {creationCounts.premium ? `(${creationCounts.premium})` : ''}
              </button>
            </div>
            <p style={{ margin: '14px 0 0', color: 'var(--muted)' }}>
              Manage artworks you created, from draft through public review and
              publication.
            </p>
          </>
        ) : (
          <>
            <div
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}
            >
              <button
                type="button"
                className={pillButtonClass(collectionTab === 'all')}
                onClick={() => setCollectionTab('all')}
              >
                All {collection.length ? `(${collection.length})` : ''}
              </button>
            </div>
            <p style={{ margin: '14px 0 0', color: 'var(--muted)' }}>
              Artworks you currently own. You can still manage sale settings when
              you are the current owner.
            </p>
          </>
        )}
      </div>

      {activeItems.length === 0 ? (
        <div className="card surface-section">
          {primaryTab === 'creations' ? (
            creationTab === 'draft' ? (
              <>
                <p style={{ margin: '0 0 12px' }}>
                  You do not have draft artworks yet.
                </p>
                <Link href="/upload" className="button primary">
                  Create artwork
                </Link>
              </>
            ) : (
              <p style={{ margin: 0 }}>No artworks found in this section yet.</p>
            )
          ) : (
            <p style={{ margin: 0 }}>You do not own any artworks yet.</p>
          )}
        </div>
      ) : (
        <div className="stack-md">
          {activeItems.map((artwork) => {
            const mintWindowStatus = getMintWindowStatus(artwork);
            const showMintButton =
              primaryTab === 'creations' && mintWindowStatus === 'mint_open';
            const ownerUserId =
              artwork.currentOwnerUserId ?? artwork.artistUserId ?? null;
            const canManage =
              ownerUserId === currentUserId &&
              [ArtworkStatus.PUBLISHED, ArtworkStatus.PREMIUM].includes(
                artwork.status as ArtworkStatus,
              );
            const showCreatorMeta = primaryTab === 'collection';
            const showOwnerMeta = primaryTab === 'creations';

            return (
              <ManagedArtworkCard
                key={`${primaryTab}-${artwork.id}`}
                artwork={artwork}
                mintWindowStatus={mintWindowStatus}
                reviewHours={reviewHours}
                archiveMessage={archiveMessage}
                showMintButton={showMintButton}
                canManage={canManage}
                currentUserId={currentUserId}
                showCreatorMeta={showCreatorMeta}
                showOwnerMeta={showOwnerMeta}
                loadArtworks={loadArtworks}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}