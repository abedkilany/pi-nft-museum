import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { isAdminRole } from '@/lib/roles';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { commentId, hidden } = await request.json();
    const comment = await prisma.artworkComment.findUnique({ where: { id: Number(commentId) }, include: { artwork: true } });
    if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });

    const isArtworkArtist = comment.artwork.artistUserId === currentUser.userId;
    if (!isArtworkArtist && !isAdminRole(currentUser.role)) {
      return NextResponse.json({ error: 'You cannot hide this comment.' }, { status: 403 });
    }

    await prisma.artworkComment.update({
      where: { id: comment.id },
      data: isAdminRole(currentUser.role) ? { hiddenByModerator: Boolean(hidden) } : { hiddenByArtist: Boolean(hidden) },
    });
    logger.info('Artwork comment visibility changed', { commentId: comment.id, userId: currentUser.userId, hidden: Boolean(hidden) });
    return NextResponse.json({ ok: true, message: Boolean(hidden) ? 'Comment hidden.' : 'Comment shown again.' });
  } catch (error) {
    logger.error('Failed to hide artwork comment', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
