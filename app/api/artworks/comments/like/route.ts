import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { recalculateArtworkPremiumState } from '@/lib/comment-scoring';
import { createCommunityActivity } from '@/lib/community';
import { createNotification } from '@/lib/notifications';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const { commentId } = await request.json();
    const id = Number(commentId);
    if (!id) return NextResponse.json({ error: 'Invalid comment.' }, { status: 400 });

    const comment = await prisma.artworkComment.findUnique({ where: { id } });
    if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    if (comment.authorId === currentUser.userId) {
      return NextResponse.json({ error: 'You cannot like your own comment.' }, { status: 400 });
    }

    const existing = await prisma.commentLike.findUnique({ where: { commentId_userId: { commentId: id, userId: currentUser.userId } } });
    if (existing) {
      await prisma.commentLike.delete({ where: { id: existing.id } });
      await recalculateArtworkPremiumState(comment.artworkId);
      return NextResponse.json({ ok: true, message: 'Comment like removed.' });
    }

    await prisma.commentLike.create({ data: { commentId: id, userId: currentUser.userId } });
    await recalculateArtworkPremiumState(comment.artworkId);
    await Promise.all([
      createNotification({
        userId: comment.authorId,
        type: 'COMMENT_LIKE',
        title: 'Comment liked',
        message: `@${currentUser.username} liked your comment.`,
        linkUrl: `/artwork/${comment.artworkId}`,
      }),
      createCommunityActivity({
        actorId: currentUser.userId,
        subjectUserId: comment.authorId,
        type: 'COMMENT_LIKE',
        title: 'Liked a comment',
        message: `@${currentUser.username} liked a comment in an artwork discussion.`,
        linkUrl: `/artwork/${comment.artworkId}`,
      }),
    ]);
    logger.info('Artwork comment liked', { commentId: id, userId: currentUser.userId });
    return NextResponse.json({ ok: true, message: 'Comment liked.' });
  } catch (error) {
    logger.error('Failed to toggle artwork comment like', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}