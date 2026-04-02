import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { getBooleanSetting, getSiteSettingsMap } from '@/lib/site-settings';
import { serializeArtworkDetail, buildArtworkViewerState } from '@/lib/domains/artworks';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

async function loadArtwork(id: number) {
  return prisma.artwork.findUnique({
    where: { id },
    include: {
      artist: { include: { artistProfile: true } },
      category: true,
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: true, commentLikes: { select: { userId: true } } },
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const artworkId = Number(request.nextUrl.searchParams.get('id'));
  if (!artworkId) {
    return NextResponse.json({ ok: false, error: 'Artwork id is required.' }, { status: 400 });
  }

  const [artwork, currentUser, settings] = await Promise.all([
    loadArtwork(artworkId),
    getCurrentUser(),
    getSiteSettingsMap(),
  ]);

  if (!artwork) {
    return NextResponse.json({ ok: false, error: 'Artwork not found.' }, { status: 404 });
  }

  if (!currentUser) {
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  }

  const isOwner = currentUser.userId === artwork.artistUserId;
  const canModerateArtwork = await userHasPermission(currentUser, PERMISSIONS.artworksModerate);
  if (!isOwner && !canModerateArtwork) {
    return NextResponse.json({ ok: false, error: 'Not allowed.' }, { status: 403 });
  }

  const [canCreatePayments, _commentsEnabled] = await Promise.all([
    userHasPermission(currentUser, PERMISSIONS.paymentsCreate),
    Promise.resolve(getBooleanSetting(settings, 'comments_enabled', true)),
  ]);

  return NextResponse.json({
    ok: true,
    artwork: serializeArtworkDetail(artwork, currentUser),
    viewer: buildArtworkViewerState(artwork, currentUser, _commentsEnabled, canCreatePayments),
  });
}
