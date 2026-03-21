import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { ArtworkComments } from '@/components/artwork/ArtworkComments';
import { ArtworkReportForm } from '@/components/artwork/ArtworkReportForm';
import { getCurrentUser } from '@/lib/current-user';
import { getBooleanSetting, getSiteSettingsMap } from '@/lib/site-settings';
import { getReviewStatuses } from '@/lib/artwork-workflow';
import { PiPaymentButton } from '@/components/artwork/PiPaymentButton';

interface Props { params: { id: string } }

export default async function ArtworkDetailPage({ params }: Props) {
  const artworkId = Number(params.id);
  if (!artworkId) notFound();

  const [artwork, currentUser, settings] = await Promise.all([
    prisma.artwork.findUnique({
      where: { id: artworkId },
      include: {
        artist: { include: { artistProfile: true } },
        category: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: true, commentLikes: { select: { userId: true } } },
        },
      },
    }),
    getCurrentUser(),
    getSiteSettingsMap(),
  ]);

  if (!artwork) notFound();

  const reviewStatuses = getReviewStatuses(settings);
  const canView = Boolean(
    currentUser && (
      currentUser.userId === artwork.artistUserId ||
      currentUser.role === 'admin' ||
      currentUser.role === 'superadmin'
    )
  ) || ['PUBLISHED', 'PREMIUM', 'SOLD'].includes(artwork.status) || reviewStatuses.includes(artwork.status as any);

  if (!canView) notFound();

  const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
  const commentsEnabled = getBooleanSetting(settings, 'comments_enabled', true);

  return (
    <div className="page-stack">
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <img src={artwork.imageUrl} alt={artwork.title} style={{ width: '100%', maxHeight: '520px', objectFit: 'cover', display: 'block' }} />
        <div className="surface-section">
          <div className="card-actions" style={{ marginTop: 0, marginBottom: 10 }}>
            <h1 style={{ margin: 0 }}>{artwork.title}</h1>
            {artwork.status === 'PREMIUM' ? <PremiumBadge /> : null}
          </div>
          <p style={{ margin: '0 0 8px', opacity: 0.8 }}>Artwork ID: {artwork.id}</p>
          <p style={{ margin: '0 0 8px', opacity: 0.8 }}>Artist: {artwork.artist.username ? <Link href={`/profile/${artwork.artist.username}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{artistName}</Link> : artistName}</p>
          <p style={{ margin: '0 0 8px', opacity: 0.8 }}>Category: {artwork.category?.name || 'General'}</p>
          <p style={{ margin: '0 0 16px', opacity: 0.9 }}>{artwork.description}</p>
          <div style={{ display: 'grid', gap: '8px' }}>
            <p style={{ margin: 0 }}><strong>Base price:</strong> {Number((artwork as any).basePrice ?? artwork.price).toFixed(2)} {artwork.currency}</p><p style={{ margin: 0 }}><strong>Discount:</strong> {Number((artwork as any).discountPercent ?? 0).toFixed(2)}%</p><p style={{ margin: 0 }}><strong>Final price:</strong> {Number(artwork.price).toFixed(2)} {artwork.currency}</p>
            <p style={{ margin: 0 }}><strong>Status:</strong> {artwork.status}</p>
            <p style={{ margin: 0 }}><strong>Rating:</strong> {Number(artwork.averageRating).toFixed(1)} ({artwork.ratingsCount} ratings)</p>
            <p style={{ margin: 0 }}><strong>Likes:</strong> {artwork.likesCount}</p>
            <p style={{ margin: 0 }}><strong>Dislikes:</strong> {artwork.dislikesCount}</p>
            <p style={{ margin: 0 }}><strong>Premium Score:</strong> {Number(artwork.premiumScore || 0).toFixed(2)}</p>
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
                amount={Number(artwork.price)}
                currency={artwork.currency}
                disabled={
                  !currentUser ||
                  currentUser.userId === artwork.artistUserId ||
                  !['PUBLISHED', 'PREMIUM'].includes(artwork.status) ||
                  !['artist_or_trader', 'admin', 'superadmin'].includes(currentUser.role)
                }
                disabledReason={
                  !currentUser
                    ? 'Connect with Pi first to test payments.'
                    : currentUser.userId === artwork.artistUserId
                      ? 'You cannot buy your own artwork.'
                      : !['PUBLISHED', 'PREMIUM'].includes(artwork.status)
                        ? 'Only published or premium artworks can be paid for right now.'
                        : !['artist_or_trader', 'admin', 'superadmin'].includes(currentUser.role)
                          ? 'Your current role cannot make payments.'
                          : null
                }
              />
            </div>
          )}

        </div>
      </div>

      <ArtworkReportForm artworkId={artwork.id} canReport={Boolean(currentUser)} />

      <ArtworkComments
        artworkId={artwork.id}
        canComment={commentsEnabled && Boolean(currentUser)}
        currentUserId={currentUser?.userId || null}
        canModerate={currentUser?.role === 'admin' || currentUser?.role === 'superadmin'}
        canHide={Boolean(currentUser && (currentUser.userId === artwork.artistUserId || currentUser.role === 'admin' || currentUser.role === 'superadmin'))}
        comments={artwork.comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          authorId: comment.authorId,
          parentId: comment.parentId,
          commentKind: comment.commentKind as 'FIRST_COMMENT' | 'REPLY' | 'ARTIST_REPLY',
          stanceType: comment.stanceType,
          scoreImpact: Number(comment.scoreImpact || 0),
          hiddenByArtist: comment.hiddenByArtist,
          hiddenByModerator: comment.hiddenByModerator,
          likesCount: comment.commentLikes.length,
          viewerLiked: Boolean(currentUser && comment.commentLikes.some((like) => like.userId === currentUser.userId)),
          author: {
            username: comment.author.username,
            fullName: comment.author.fullName,
            profileImage: comment.author.profileImage,
          },
        }))}
      />
    </div>
  );
}
