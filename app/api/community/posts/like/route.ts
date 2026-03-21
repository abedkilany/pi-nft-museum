import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { createCommunityActivity, createNotification } from '@/lib/community';

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

  const rateLimitError = applyRateLimit(request, [currentUser.userId], 'community-post-like', [
    { limit: 20, windowMs: 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const payload = await request.json().catch(() => ({}));
  const postId = Number(payload.postId);

  if (!postId) {
    return NextResponse.json({ error: 'Invalid post.' }, { status: 400 });
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, isPublished: true },
  });

  if (!post || !post.isPublished) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }

  if (post.authorId === currentUser.userId) {
    return NextResponse.json({ error: 'You cannot like your own post.' }, { status: 400 });
  }

  const existing = await prisma.communityPostLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: currentUser.userId,
      },
    },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.communityPostLike.delete({ where: { id: existing.id } }),
      prisma.communityPost.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } }),
    ]);

    return NextResponse.json({ ok: true, liked: false, message: 'Like removed.' });
  }

  await prisma.$transaction([
    prisma.communityPostLike.create({ data: { postId, userId: currentUser.userId } }),
    prisma.communityPost.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } }),
  ]);

  await Promise.all([
    createCommunityActivity({
      actorId: currentUser.userId,
      subjectUserId: post.authorId,
      type: 'COMMUNITY_LIKE',
      title: 'Liked a post',
      message: `@${currentUser.username} liked a community post.`,
      linkUrl: '/community',
    }),
    createNotification({
      userId: post.authorId,
      type: 'COMMUNITY_LIKE',
      title: 'Post liked',
      message: `@${currentUser.username} liked your community post.`,
      linkUrl: '/community',
    }),
  ]);

  return NextResponse.json({ ok: true, liked: true, message: 'Post liked.' });
}
