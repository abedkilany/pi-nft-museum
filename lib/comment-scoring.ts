import { prisma } from '@/lib/prisma';
import { calculatePremiumScoreFromSettings, getNumberSetting, getSiteSettingsMap, isEligibleForPremium } from '@/lib/site-settings';

export const COMMENT_STANCE_OPTIONS = [
  'SUPPORT_PUBLISH',
  'SUPPORT_PREMIUM',
  'NEEDS_IMPROVEMENT',
  'RECOMMEND_REMOVAL',
] as const;

export type CommentStance = (typeof COMMENT_STANCE_OPTIONS)[number];

export function getCommentStanceWeightKey(stance: CommentStance) {
  switch (stance) {
    case 'SUPPORT_PUBLISH':
      return 'comment_first_support_publish_weight';
    case 'SUPPORT_PREMIUM':
      return 'comment_first_support_premium_weight';
    case 'NEEDS_IMPROVEMENT':
      return 'comment_first_needs_improvement_weight';
    case 'RECOMMEND_REMOVAL':
      return 'comment_first_recommend_removal_weight';
    default:
      return 'comment_first_support_publish_weight';
  }
}

export async function getCommentScoreImpact(args: {
  artworkId: number;
  authorId: number;
  isArtistReply: boolean;
  stanceType?: string | null;
  isReply: boolean;
}) {
  const settings = await getSiteSettingsMap();

  if (!args.isReply && args.stanceType && COMMENT_STANCE_OPTIONS.includes(args.stanceType as CommentStance)) {
    return getNumberSetting(settings, getCommentStanceWeightKey(args.stanceType as CommentStance), 0);
  }

  const baseWeight = getNumberSetting(settings, args.isArtistReply ? 'comment_artist_reply_weight' : 'comment_reply_weight', 0);
  const maxPerUser = getNumberSetting(settings, 'comment_max_score_per_user_per_artwork', 20);

  if (baseWeight <= 0 || maxPerUser <= 0) return 0;

  const aggregate = await prisma.artworkComment.aggregate({
    where: {
      artworkId: args.artworkId,
      authorId: args.authorId,
      scoreEffectEnabled: true,
      hiddenByModerator: false,
      commentKind: { in: ['REPLY', 'ARTIST_REPLY'] },
    },
    _sum: { scoreImpact: true },
  });

  const current = Number(aggregate._sum.scoreImpact || 0);
  const remaining = Math.max(0, maxPerUser - current);
  return Math.min(baseWeight, remaining);
}

export async function getCommentLikeScoreImpact(commentId: number) {
  const [comment, settings, likesCount] = await Promise.all([
    prisma.artworkComment.findUnique({ where: { id: commentId } }),
    getSiteSettingsMap(),
    prisma.commentLike.count({ where: { commentId } }),
  ]);
  if (!comment) return null;
  const likeWeight = getNumberSetting(settings, 'comment_like_weight', 0.2);
  const maxPerComment = Math.max(0, getNumberSetting(settings, 'comment_like_max_per_comment', 5));
  const scoreFromLikes = Math.min(maxPerComment, likesCount) * likeWeight;
  return { comment, scoreFromLikes };
}

export async function recalculateArtworkPremiumState(artworkId: number) {
  const [artwork, settings, comments, likesByComment] = await Promise.all([
    prisma.artwork.findUnique({ where: { id: artworkId } }),
    getSiteSettingsMap(),
    prisma.artworkComment.findMany({ where: { artworkId, scoreEffectEnabled: true }, select: { id: true, scoreImpact: true } }),
    prisma.commentLike.findMany({ where: { comment: { artworkId } }, select: { commentId: true } }),
  ]);

  if (!artwork) return null;

  const likeWeight = getNumberSetting(settings, 'comment_like_weight', 0.2);
  const maxPerComment = Math.max(0, getNumberSetting(settings, 'comment_like_max_per_comment', 5));
  const likeCounts = new Map<number, number>();
  for (const item of likesByComment as any[]) likeCounts.set(item.commentId, (likeCounts.get(item.commentId) || 0) + 1);
  const commentLikeMap = new Map(Array.from(likeCounts.entries()).map(([commentId, count]) => [commentId, Math.min(maxPerComment, Number(count || 0)) * likeWeight]));
  const commentsScore = comments.reduce((sum: number, comment: any) => sum + Number(comment.scoreImpact || 0) + Number(commentLikeMap.get(comment.id) || 0), 0);
  const premiumScore = calculatePremiumScoreFromSettings(
    artwork.likesCount,
    artwork.dislikesCount,
    Number(artwork.averageRating),
    settings,
    commentsScore,
  );

  const updateData: Record<string, unknown> = { premiumScore };
  if (artwork.status === 'PUBLISHED' || artwork.status === 'PREMIUM') {
    const nextStatus = isEligibleForPremium(premiumScore, settings) ? 'PREMIUM' : 'PUBLISHED';
    updateData.status = nextStatus;
    updateData.premiumAt = nextStatus === 'PREMIUM' ? (artwork.premiumAt || new Date()) : null;
  }

  const updated = await prisma.artwork.update({ where: { id: artworkId }, data: updateData as any });
  return { artwork: updated, commentsScore, premiumScore };
}
