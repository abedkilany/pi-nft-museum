import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { commentId, reason, description } = await request.json();
    const id = Number(commentId);
    if (!id) return NextResponse.json({ error: 'Invalid comment.' }, { status: 400 });
    const comment = await prisma.artworkComment.findUnique({ where: { id } });
    if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });

    const existingRecent = await prisma.commentReport.findFirst({
      where: { commentId: id, reporterId: currentUser.userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (existingRecent) return NextResponse.json({ error: 'You already reported this comment recently.' }, { status: 429 });

    await prisma.commentReport.create({
      data: {
        commentId: id,
        reporterId: currentUser.userId,
        reason: String(reason || 'OTHER').trim() || 'OTHER',
        description: String(description || '').trim() || null,
      },
    });

    logger.warn('Comment reported', { commentId: id, reporterId: currentUser.userId });
    return NextResponse.json({ ok: true, message: 'Comment report submitted.' });
  } catch (error) {
    logger.error('Failed to report artwork comment', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
