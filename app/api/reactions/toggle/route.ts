import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { getBooleanSetting, getSiteSettingsMap } from '@/lib/site-settings';
import { recalculateArtworkPremiumState } from '@/lib/comment-scoring';
import { canReceiveReactions } from '@/lib/artwork-status';
import { createCommunityActivity } from '@/lib/community';
import { createNotification } from '@/lib/notifications';
import { toSafeInt, toTrimmedString } from '@/lib/validators';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const csrfError = assertSameOrigin(request);
    if (csrfError) return csrfError;

    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'You must be logged in to react.' }, { status: 401 });

    const rateLimitError = applyRateLimit(request, [currentUser.userId], 'artwork-reaction', [
      { limit: 20, windowMs: 60 * 1000 },
      { limit: 150, windowMs: 60 * 60 * 1000 },
    ]);
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const artworkId = toSafeInt(body.artworkId);
    const type = toTrimmedString(body.type).toUpperCase();
    if (!artworkId || !['LIKE', 'DISLIKE'].includes(type)) return NextResponse.json({ error: 'Invalid artwork ID or reaction type.' }, { status: 400 });

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
    if (!artwork) return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    if (!canReceiveReactions(artwork.status)) return NextResponse.json({ error: 'Only minted gallery artworks can receive public reactions.' }, { status: 400 });

    const settings = await getSiteSettingsMap();
    const premiumAllowDislike = getBooleanSetting(settings, 'premium_allow_dislike', false);
    if (artwork.status === 'PREMIUM' && type === 'DISLIKE' && !premiumAllowDislike) return NextResponse.json({ error: 'Dislike is disabled for premium artworks.' }, { status: 400 });

    const existingReaction = await prisma.artworkReaction.findUnique({ where: { artworkId_userId: { artworkId, userId: currentUser.userId } } });
    let currentReaction: 'LIKE' | 'DISLIKE' | null = null;
    if (!existingReaction) {
      await prisma.artworkReaction.create({ data: { artworkId, userId: currentUser.userId, type: type as 'LIKE' | 'DISLIKE' } });
      currentReaction = type as 'LIKE' | 'DISLIKE';
    } else if (existingReaction.type === type) {
      await prisma.artworkReaction.delete({ where: { artworkId_userId: { artworkId, userId: currentUser.userId } } });
    } else {
      await prisma.artworkReaction.update({ where: { artworkId_userId: { artworkId, userId: currentUser.userId } }, data: { type: type as 'LIKE' | 'DISLIKE' } });
      currentReaction = type as 'LIKE' | 'DISLIKE';
    }

    const grouped = await prisma.artworkReaction.groupBy({
      by: ['type'],
      where: { artworkId },
      _count: { type: true },
    });
    const likesCount = grouped.find((row) => row.type === 'LIKE')?._count.type ?? 0;
    const dislikesCount = grouped.find((row) => row.type === 'DISLIKE')?._count.type ?? 0;

    const updated = await prisma.artwork.update({ where: { id: artworkId }, data: { likesCount, dislikesCount } });

    const recalculated = await recalculateArtworkPremiumState(artworkId);
    const nextStatus = recalculated?.artwork.status || updated.status;
    const premiumScore = recalculated?.premiumScore || Number(updated.premiumScore || 0);

    if (currentReaction === 'LIKE' && artwork.artistUserId !== currentUser.userId) {
      await Promise.all([
        createNotification({
          userId: artwork.artistUserId,
          type: 'ARTWORK_LIKE',
          title: 'Artwork liked',
          message: `@${currentUser.username} liked your artwork.`,
          linkUrl: `/artwork/${artworkId}`,
        }),
        createCommunityActivity({
          actorId: currentUser.userId,
          subjectUserId: artwork.artistUserId,
          type: 'ARTWORK_LIKE',
          title: 'Liked artwork',
          message: `@${currentUser.username} liked an artwork.`,
          linkUrl: `/artwork/${artworkId}`,
        }),
      ]);
    }

    logger.info('Artwork reaction updated', { artworkId, userId: currentUser.userId, currentReaction, likesCount, dislikesCount, premiumScore, nextStatus });
    return NextResponse.json({ ok: true, currentReaction, likesCount, dislikesCount, premiumScore, nextStatus });
  } catch (error) {
    logger.error('Failed to toggle artwork reaction', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
