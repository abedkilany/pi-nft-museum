import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { logger } from '@/lib/domains/system';
import { getBooleanSetting, getSiteSettingsMap } from '@/lib/site-settings';
import { recalculateArtworkPremiumState } from '@/lib/comment-scoring';
import { canReceiveReactions } from '@/lib/domains/artworks';
import { createCommunityActivity } from '@/lib/domains/community';
import { createNotification } from '@/lib/domains/notifications';
import { syncArtworkEngagementCounts } from '@/lib/counter-consistency';
import { getEnumField, getNumberField, readJsonObject } from '@/lib/services/request';
import { assertSameOrigin, applyRateLimit } from '@/lib/services/request';

export async function POST(request: Request) {
  try {
    const csrfError = assertSameOrigin(request);
    if (csrfError) return csrfError;

    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ ok: false, error: 'You must be logged in to react.' }, { status: 401 });

    const rateLimitError = applyRateLimit(request, [currentUser.userId], 'artwork-reaction', [
      { limit: 20, windowMs: 60 * 1000 },
      { limit: 150, windowMs: 60 * 60 * 1000 },
    ]);
    if (rateLimitError) return rateLimitError;

    const bodyResult = await readJsonObject(request);
    if (!bodyResult.ok) return bodyResult.response;

    const artworkIdResult = getNumberField(bodyResult.data, 'artworkId', { required: true, integer: true, min: 1 });
    if (!artworkIdResult.ok) return artworkIdResult.response;
    const typeResult = getEnumField(bodyResult.data, 'type', ['LIKE', 'DISLIKE'] as const, { required: true, normalize: 'upper' });
    if (!typeResult.ok) return typeResult.response;

    const artworkId = artworkIdResult.data;
    const type = typeResult.data;

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
    if (!artwork) return NextResponse.json({ ok: false, error: 'Artwork not found.' }, { status: 404 });
    if (!canReceiveReactions(artwork)) return NextResponse.json({ ok: false, error: 'Only minted gallery artworks can receive public reactions.' }, { status: 400 });

    const settings = await getSiteSettingsMap();
    const premiumAllowDislike = getBooleanSetting(settings, 'premium_allow_dislike', false);
    if (artwork.status === 'PREMIUM' && type === 'DISLIKE' && !premiumAllowDislike) return NextResponse.json({ ok: false, error: 'Dislike is disabled for premium artworks.' }, { status: 400 });

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

    const engagement = await syncArtworkEngagementCounts(artworkId);

    const recalculated = await recalculateArtworkPremiumState(artworkId);
    const likesCount = Number(recalculated?.artwork.likesCount ?? engagement.likesCount ?? 0);
    const dislikesCount = Number(recalculated?.artwork.dislikesCount ?? engagement.dislikesCount ?? 0);
    const nextStatus = recalculated?.artwork.status || engagement.status;
    const premiumScore = Number(recalculated?.premiumScore ?? engagement.premiumScore ?? 0);

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

    revalidatePath('/gallery');
    revalidatePath('/premium');
    revalidatePath(`/artwork/${artworkId}`);

    logger.info('Artwork reaction updated', { artworkId, userId: currentUser.userId, currentReaction, likesCount, dislikesCount, premiumScore, nextStatus });
    return NextResponse.json({ ok: true, currentReaction, likesCount, dislikesCount, premiumScore, nextStatus });
  } catch (error) {
    logger.error('Failed to toggle artwork reaction', error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
