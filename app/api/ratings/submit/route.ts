import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { getNumberSetting, getSiteSettingsMap } from '@/lib/site-settings';
import { recalculateArtworkPremiumState } from '@/lib/comment-scoring';
import { canReceiveRatings } from '@/lib/artwork-status';
import { toSafeInt } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'You must be logged in to rate artworks.' }, { status: 401 });

    const body = await request.json();
    const artworkId = toSafeInt(body.artworkId);
    const value = toSafeInt(body.value);
    const settings = await getSiteSettingsMap();
    const ratingMin = getNumberSetting(settings, 'rating_min', 1);
    const ratingMax = getNumberSetting(settings, 'rating_max', 5);
    if (!artworkId || !value || value < ratingMin || value > ratingMax) return NextResponse.json({ error: 'Invalid artwork ID or rating value.' }, { status: 400 });

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
    if (!artwork) return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    if (!canReceiveRatings(artwork.status)) return NextResponse.json({ error: 'Only artworks in public review can be rated.' }, { status: 400 });

    await prisma.rating.upsert({ where: { artworkId_userId: { artworkId, userId: currentUser.userId } }, update: { value }, create: { artworkId, userId: currentUser.userId, value } });

    const [ratingsCount, aggregate] = await Promise.all([
      prisma.rating.count({ where: { artworkId } }),
      prisma.rating.aggregate({ where: { artworkId }, _avg: { value: true } }),
    ]);

    const averageRating = Number(aggregate._avg.value || 0);
    await prisma.artwork.update({ where: { id: artworkId }, data: { averageRating, ratingsCount } });
    const recalculated = await recalculateArtworkPremiumState(artworkId);

    logger.info('Artwork rated successfully', { artworkId, userId: currentUser.userId, value, averageRating, ratingsCount, premiumScore: recalculated?.premiumScore });
    return NextResponse.json({ ok: true, averageRating, ratingsCount, premiumScore: recalculated?.premiumScore || 0 });
  } catch (error) {
    logger.error('Failed to submit artwork rating', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
