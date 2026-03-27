import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { logger } from '@/lib/domains/system';
import { getNumberSetting, getSiteSettingsMap } from '@/lib/site-settings';
import { recalculateArtworkPremiumState } from '@/lib/comment-scoring';
import { canReceiveRatings } from '@/lib/domains/artworks';
import { syncArtworkEngagementCounts } from '@/lib/counter-consistency';
import { assertSameOrigin } from '@/lib/services/request';
import { getNumberField, readJsonObject, validationError } from '@/lib/services/request';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ ok: false, error: 'You must be logged in to rate artworks.' }, { status: 401 });

    const bodyResult = await readJsonObject(request);
    if (!bodyResult.ok) return bodyResult.response;

    const artworkIdResult = getNumberField(bodyResult.data, 'artworkId', { required: true, integer: true, min: 1 });
    if (!artworkIdResult.ok) return artworkIdResult.response;
    const valueResult = getNumberField(bodyResult.data, 'value', { required: true, integer: true, min: 1 });
    if (!valueResult.ok) return valueResult.response;

    const artworkId = artworkIdResult.data;
    const value = valueResult.data;
    const settings = await getSiteSettingsMap();
    const ratingMin = getNumberSetting(settings, 'rating_min', 1);
    const ratingMax = getNumberSetting(settings, 'rating_max', 5);
    if (value < ratingMin || value > ratingMax) {
      return validationError('Invalid artwork ID or rating value.', { value: `Must be between ${ratingMin} and ${ratingMax}` });
    }

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
    if (!artwork) return NextResponse.json({ ok: false, error: 'Artwork not found.' }, { status: 404 });
    if (!canReceiveRatings(artwork.status)) return NextResponse.json({ ok: false, error: 'Only artworks in public review can be rated.' }, { status: 400 });

    await prisma.rating.upsert({ where: { artworkId_userId: { artworkId, userId: currentUser.userId } }, update: { value }, create: { artworkId, userId: currentUser.userId, value } });

    const engagement = await syncArtworkEngagementCounts(artworkId);
    const recalculated = await recalculateArtworkPremiumState(artworkId);
    const averageRating = Number(recalculated?.artwork.averageRating ?? engagement.averageRating ?? 0);
    const ratingsCount = Number(recalculated?.artwork.ratingsCount ?? engagement.ratingsCount ?? 0);
    const premiumScore = Number(recalculated?.premiumScore ?? engagement.premiumScore ?? 0);

    logger.info('Artwork rated successfully', { artworkId, userId: currentUser.userId, value, averageRating, ratingsCount, premiumScore });
    return NextResponse.json({ ok: true, averageRating, ratingsCount, premiumScore });
  } catch (error) {
    logger.error('Failed to submit artwork rating', error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
