import Link from 'next/link';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { ArtworkComments } from '@/components/artwork/ArtworkComments';
import { ArtworkReportForm } from '@/components/artwork/ArtworkReportForm';
import { PiPaymentButton } from '@/components/artwork/PiPaymentButton';
import type { ArtworkDetailDto, ArtworkViewerStateDto } from '@/lib/artwork-detail';
import { getDisplayImageUrl } from '@/lib/image-url';

export default function ArtworkDetailContent({
  artwork,
  viewer,
}: {
  artwork: ArtworkDetailDto;
  viewer: ArtworkViewerStateDto;
}) {
  return (
    <div className="page-stack">
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <img src={getDisplayImageUrl(artwork.imageUrl)} alt={artwork.title} style={{ width: '100%', maxHeight: '520px', objectFit: 'cover', display: 'block' }} />
        <div className="surface-section">
          <div className="card-actions" style={{ marginTop: 0, marginBottom: 10 }}>
            <h1 style={{ margin: 0 }}>{artwork.title}</h1>
            {artwork.status === 'PREMIUM' ? <PremiumBadge /> : null}
          </div>
          <p style={{ margin: '0 0 8px', opacity: 0.8 }}>Artwork ID: {artwork.id}</p>
          <p style={{ margin: '0 0 8px', opacity: 0.8 }}>Artist: {artwork.artistUsername ? <Link href={`/profile/${artwork.artistUsername}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{artwork.artistName}</Link> : artwork.artistName}</p>
          <p style={{ margin: '0 0 8px', opacity: 0.8 }}>Category: {artwork.categoryName}</p>
          <p style={{ margin: '0 0 16px', opacity: 0.9 }}>{artwork.description}</p>
          <div style={{ display: 'grid', gap: '8px' }}>
            <p style={{ margin: 0 }}><strong>Base price:</strong> {artwork.basePrice.toFixed(2)} {artwork.currency}</p>
            <p style={{ margin: 0 }}><strong>Discount:</strong> {artwork.discountPercent.toFixed(2)}%</p>
            <p style={{ margin: 0 }}><strong>Final price:</strong> {artwork.finalPrice.toFixed(2)} {artwork.currency}</p>
            <p style={{ margin: 0 }}><strong>Status:</strong> {artwork.status}</p>
            <p style={{ margin: 0 }}><strong>Rating:</strong> {artwork.averageRating.toFixed(1)} ({artwork.ratingsCount} ratings)</p>
            <p style={{ margin: 0 }}><strong>Likes:</strong> {artwork.likesCount}</p>
            <p style={{ margin: 0 }}><strong>Dislikes:</strong> {artwork.dislikesCount}</p>
            <p style={{ margin: 0 }}><strong>Premium Score:</strong> {artwork.premiumScore.toFixed(2)}</p>
          </div>

          {artwork.status === 'SOLD' ? (
            <div className="card" style={{ padding: '16px', marginTop: '16px' }}>
              <strong>This artwork has already been sold.</strong>
            </div>
          ) : (
            <div className="card" style={{ padding: '16px', marginTop: '16px', display: 'grid', gap: '12px' }}>
              <strong>Pi payment (Testnet)</strong>
              <PiPaymentButton
                artworkId={artwork.id}
                title={artwork.title}
                amount={artwork.finalPrice}
                currency={artwork.currency}
                disabled={viewer.paymentDisabled}
                disabledReason={viewer.paymentDisabledReason}
              />
            </div>
          )}
        </div>
      </div>

      <ArtworkReportForm artworkId={artwork.id} canReport={viewer.canReport} />

      <ArtworkComments
        artworkId={artwork.id}
        canComment={viewer.canComment}
        currentUserId={viewer.userId}
        canModerate={viewer.canModerate}
        canHide={viewer.canHide}
        comments={artwork.comments}
      />
    </div>
  );
}
