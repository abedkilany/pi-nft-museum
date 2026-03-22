import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { createCommunityActivity } from '@/lib/community';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const rateLimitError = applyRateLimit(request, [currentUser.userId], 'community-post-create', [
    { limit: 3, windowMs: 60 * 1000 },
    { limit: 15, windowMs: 10 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const payload = await request.json().catch(() => ({}));
  const body = String(payload.body || '').trim();
  const artworkId = payload.artworkId == null || payload.artworkId === '' ? null : Number(payload.artworkId);

  if (body.length < 3 || body.length > 1500) {
    return NextResponse.json({ error: 'Post length must be between 3 and 1500 characters.' }, { status: 400 });
  }

  let linkedArtwork: { id: number; title: string } | null = null;
  if (artworkId !== null) {
    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return NextResponse.json({ error: 'Invalid artwork.' }, { status: 400 });
    }

    linkedArtwork = await prisma.artwork.findFirst({
      where: {
        id: artworkId,
        artistUserId: currentUser.userId,
      },
      select: { id: true, title: true },
    });

    if (!linkedArtwork) {
      return NextResponse.json({ error: 'You can only link one of your own artworks.' }, { status: 404 });
    }
  }

  const created = await prisma.communityPost.create({
    data: {
      authorId: currentUser.userId,
      artworkId,
      body,
      isPublished: true,
    },
  });

  await createCommunityActivity({
    actorId: currentUser.userId,
    subjectUserId: null,
    type: 'COMMUNITY_POST',
    title: linkedArtwork ? 'Shared an artwork in the community' : 'Published a post',
    message: linkedArtwork
      ? `@${currentUser.username} shared the artwork "${linkedArtwork.title}" in the community.`
      : `@${currentUser.username} published a new community post.`,
    linkUrl: '/community',
  });

  return NextResponse.json({ ok: true, postId: created.id, message: 'Post published.' });
}
