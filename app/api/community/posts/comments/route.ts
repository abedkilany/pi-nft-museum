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

  const rateLimitError = applyRateLimit(request, [currentUser.userId], 'community-post-comment', [
    { limit: 8, windowMs: 60 * 1000 },
    { limit: 25, windowMs: 10 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const payload = await request.json().catch(() => ({}));
  const postId = Number(payload.postId);
  const parentId = payload.parentId == null ? null : Number(payload.parentId);
  const body = String(payload.body || '').trim();

  if (!postId) {
    return NextResponse.json({ error: 'Invalid post.' }, { status: 400 });
  }
  if (body.length < 2 || body.length > 1000) {
    return NextResponse.json({ error: 'Comment length must be between 2 and 1000 characters.' }, { status: 400 });
  }
  if (parentId !== null && !Number.isInteger(parentId)) {
    return NextResponse.json({ error: 'Invalid parent comment.' }, { status: 400 });
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, isPublished: true },
  });

  if (!post || !post.isPublished) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }

  let parentComment: { id: number; postId: number; authorId: number; parentId: number | null } | null = null;
  if (parentId !== null) {
    parentComment = await prisma.communityPostComment.findUnique({
      where: { id: parentId },
      select: { id: true, postId: true, authorId: true, parentId: true },
    });

    if (!parentComment || parentComment.postId !== postId) {
      return NextResponse.json({ error: 'Parent comment not found.' }, { status: 404 });
    }

    if (parentComment.parentId !== null) {
      return NextResponse.json({ error: 'Only one reply level is supported right now.' }, { status: 400 });
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const comment = await tx.communityPostComment.create({
      data: {
        postId,
        authorId: currentUser.userId,
        parentId,
        body,
      },
    });

    await tx.communityPost.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return comment;
  });

  const linkUrl = '/community';
  const activityTitle = parentComment ? 'Replied to a comment' : 'Commented on a post';
  const activityMessage = parentComment
    ? `@${currentUser.username} replied to a comment in the community.`
    : `@${currentUser.username} commented on a community post.`;

  const notifications: Promise<any>[] = [];

  if (post.authorId !== currentUser.userId) {
    notifications.push(
      createNotification({
        userId: post.authorId,
        type: parentComment ? 'COMMUNITY_REPLY' : 'COMMUNITY_COMMENT',
        title: parentComment ? 'New reply in your post' : 'New post comment',
        message: parentComment
          ? `@${currentUser.username} replied in a discussion on your community post.`
          : `@${currentUser.username} commented on your community post.`,
        linkUrl,
      })
    );
  }

  if (parentComment && parentComment.authorId !== currentUser.userId && parentComment.authorId !== post.authorId) {
    notifications.push(
      createNotification({
        userId: parentComment.authorId,
        type: 'COMMUNITY_REPLY',
        title: 'New reply to your comment',
        message: `@${currentUser.username} replied to your comment.`,
        linkUrl,
      })
    );
  }

  await Promise.all([
    createCommunityActivity({
      actorId: currentUser.userId,
      subjectUserId: parentComment?.authorId ?? post.authorId,
      type: parentComment ? 'COMMUNITY_REPLY' : 'COMMUNITY_COMMENT',
      title: activityTitle,
      message: activityMessage,
      linkUrl,
    }),
    ...notifications,
  ]);

  return NextResponse.json({ ok: true, commentId: created.id, message: parentComment ? 'Reply added.' : 'Comment added.' });
}
