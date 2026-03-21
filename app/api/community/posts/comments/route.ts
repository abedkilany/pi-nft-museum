import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { createCommunityActivity, createNotification } from '@/lib/community';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const rateLimitError = applyRateLimit(request, [currentUser.userId], 'community-post-comment', [
    { limit: 8, windowMs: 60 * 1000 },
    { limit: 25, windowMs: 10 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const payload = await request.json().catch(() => ({}));
  const postId = Number(payload.postId);
  const body = String(payload.body || '').trim();

  if (!postId) {
    return NextResponse.json({ error: 'Invalid post.' }, { status: 400 });
  }
  if (body.length < 2 || body.length > 1000) {
    return NextResponse.json({ error: 'Comment length must be between 2 and 1000 characters.' }, { status: 400 });
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, isPublished: true },
  });

  if (!post || !post.isPublished) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const comment = await tx.communityPostComment.create({
      data: {
        postId,
        authorId: currentUser.userId,
        body,
      },
    });

    await tx.communityPost.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return comment;
  });

  await Promise.all([
    createCommunityActivity({
      actorId: currentUser.userId,
      subjectUserId: post.authorId,
      type: 'COMMUNITY_COMMENT',
      title: 'Commented on a post',
      message: `@${currentUser.username} commented on a community post.`,
      linkUrl: '/community',
    }),
    post.authorId !== currentUser.userId
      ? createNotification({
          userId: post.authorId,
          type: 'COMMUNITY_COMMENT',
          title: 'New post comment',
          message: `@${currentUser.username} commented on your community post.`,
          linkUrl: '/community',
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true, commentId: created.id, message: 'Comment added.' });
}
