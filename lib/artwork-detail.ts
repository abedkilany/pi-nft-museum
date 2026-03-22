import type { SessionUser } from '@/lib/auth';

export type ArtworkCommentDto = {
  id: number;
  body: string;
  createdAt: string;
  authorId: number;
  parentId?: number | null;
  commentKind: 'FIRST_COMMENT' | 'REPLY' | 'ARTIST_REPLY';
  stanceType?: string | null;
  scoreImpact: number;
  hiddenByArtist?: boolean;
  hiddenByModerator?: boolean;
  likesCount?: number;
  viewerLiked?: boolean;
  author: {
    username: string;
    fullName?: string | null;
    profileImage?: string | null;
  };
};

export type ArtworkDetailDto = {
  id: number;
  title: string;
  imageUrl: string;
  description: string;
  status: string;
  categoryName: string;
  artistUsername: string;
  artistName: string;
  currency: string;
  basePrice: number;
  discountPercent: number;
  finalPrice: number;
  averageRating: number;
  ratingsCount: number;
  likesCount: number;
  dislikesCount: number;
  premiumScore: number;
  comments: ArtworkCommentDto[];
};

export type ArtworkViewerStateDto = {
  authenticated: boolean;
  userId: number | null;
  role: string | null;
  isOwner: boolean;
  canReport: boolean;
  canComment: boolean;
  canModerate: boolean;
  canHide: boolean;
  paymentDisabled: boolean;
  paymentDisabledReason: string | null;
};

export function serializeArtworkDetail(artwork: any, currentUser: SessionUser | null): ArtworkDetailDto {
  const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
  return {
    id: artwork.id,
    title: artwork.title,
    imageUrl: artwork.imageUrl,
    description: artwork.description,
    status: String(artwork.status),
    categoryName: artwork.category?.name || 'General',
    artistUsername: artwork.artist.username,
    artistName,
    currency: artwork.currency,
    basePrice: Number((artwork as any).basePrice ?? artwork.price ?? 0),
    discountPercent: Number((artwork as any).discountPercent ?? 0),
    finalPrice: Number(artwork.price ?? 0),
    averageRating: Number(artwork.averageRating ?? 0),
    ratingsCount: Number(artwork.ratingsCount ?? 0),
    likesCount: Number(artwork.likesCount ?? 0),
    dislikesCount: Number(artwork.dislikesCount ?? 0),
    premiumScore: Number(artwork.premiumScore ?? 0),
    comments: (artwork.comments || []).map((comment: any) => ({
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
      viewerLiked: Boolean(currentUser && comment.commentLikes.some((like: any) => like.userId === currentUser.userId)),
      author: {
        username: comment.author.username,
        fullName: comment.author.fullName,
        profileImage: comment.author.profileImage,
      },
    })),
  };
}

export function buildArtworkViewerState(artwork: any, currentUser: SessionUser | null, commentsEnabled: boolean): ArtworkViewerStateDto {
  const role = currentUser?.role || null;
  const isOwner = Boolean(currentUser && currentUser.userId === artwork.artistUserId);
  const canModerate = role === 'moderator' || role === 'admin' || role === 'superadmin';
  const canHide = Boolean(currentUser && (isOwner || canModerate));

  const paymentDisabled = (
    !currentUser ||
    isOwner ||
    !['PUBLISHED', 'PREMIUM'].includes(String(artwork.status)) ||
    !['artist_or_trader', 'moderator', 'admin', 'superadmin'].includes(String(role || ''))
  );

  const paymentDisabledReason = !currentUser
    ? 'Connect with Pi first to test payments.'
    : isOwner
      ? 'You cannot buy your own artwork.'
      : !['PUBLISHED', 'PREMIUM'].includes(String(artwork.status))
        ? 'Only published or premium artworks can be paid for right now.'
        : !['artist_or_trader', 'moderator', 'admin', 'superadmin'].includes(String(role || ''))
          ? 'Your current role cannot make payments.'
          : null;

  return {
    authenticated: Boolean(currentUser),
    userId: currentUser?.userId || null,
    role,
    isOwner,
    canReport: Boolean(currentUser),
    canComment: commentsEnabled && Boolean(currentUser),
    canModerate,
    canHide,
    paymentDisabled,
    paymentDisabledReason,
  };
}
