import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { recalculateArtworkPremiumState } from '@/lib/comment-scoring';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { commentId } = await request.json();
    const comment = await prisma.artworkComment.findUnique({ where: { id: Number(commentId) }, include: { artwork: true } });
    if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    const canModerateComments = await userHasPermission(currentUser, PERMISSIONS.commentsDeleteAny);
    if (comment.authorId !== currentUser.userId && !canModerateComments) {
      return NextResponse.json({ error: 'You cannot delete this comment.' }, { status: 403 });
    }
    await prisma.artworkComment.delete({ where: { id: comment.id } });
    await recalculateArtworkPremiumState(comment.artworkId);
    logger.info('Artwork comment deleted', { commentId: comment.id, userId: currentUser.userId });
    return NextResponse.json({ ok: true, message: 'Comment deleted.' });
  } catch (error) {
    logger.error('Failed to delete artwork comment', error);
    return safeError(error);
  }
}