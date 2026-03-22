import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { getBooleanSetting, getSiteSettingsMap } from '@/lib/site-settings';
import { serializeArtworkDetail, buildArtworkViewerState } from '@/lib/artwork-detail';

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
  const isAdmin = currentUser.role === 'moderator' || currentUser.role === 'admin' || currentUser.role === 'superadmin';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ ok: false, error: 'Not allowed.' }, { status: 403 });
  }

  const commentsEnabled = getBooleanSetting(settings, 'comments_enabled', true);
  return NextResponse.json({
    ok: true,
    artwork: serializeArtworkDetail(artwork, currentUser),
    viewer: buildArtworkViewerState(artwork, currentUser, commentsEnabled),
  });
}
