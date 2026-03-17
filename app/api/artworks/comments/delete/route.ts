import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { isAdminRole } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { recalculateArtworkPremiumState } from '@/lib/comment-scoring';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { commentId } = await request.json();
    const comment = await prisma.artworkComment.findUnique({ where: { id: Number(commentId) }, include: { artwork: true } });
    if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    if (comment.authorId !== currentUser.userId && !isAdminRole(currentUser.role)) {
      return NextResponse.json({ error: 'You cannot delete this comment.' }, { status: 403 });
    }
    await prisma.artworkComment.delete({ where: { id: comment.id } });
    await recalculateArtworkPremiumState(comment.artworkId);
    logger.info('Artwork comment deleted', { commentId: comment.id, userId: currentUser.userId });
    return NextResponse.json({ ok: true, message: 'Comment deleted.' });
  } catch (error) {
    logger.error('Failed to delete artwork comment', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
