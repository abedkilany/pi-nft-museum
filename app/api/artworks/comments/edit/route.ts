import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { isAdminRole } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { COMMENT_STANCE_OPTIONS, getCommentStanceWeightKey, recalculateArtworkPremiumState } from '@/lib/comment-scoring';
import { getNumberSetting, getSiteSettingsMap } from '@/lib/site-settings';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { commentId, body, stanceType } = await request.json();
    const cleanBody = String(body || '').trim();
    const id = Number(commentId);
    if (!id || cleanBody.length < 2) return NextResponse.json({ error: 'Comment is too short.' }, { status: 400 });

    const [comment, userRecord, settings] = await Promise.all([
      prisma.artworkComment.findUnique({ where: { id } }),
      prisma.user.findUnique({ where: { id: currentUser.userId }, select: { canEditCommentsAfterDeadline: true } }),
      getSiteSettingsMap(),
    ]);
    if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    if (comment.authorId !== currentUser.userId && !isAdminRole(currentUser.role)) {
      return NextResponse.json({ error: 'You cannot edit this comment.' }, { status: 403 });
    }

    const editWindowHours = getNumberSetting(settings, 'comment_edit_window_hours', 12);
    const deadline = comment.editLockedAt || new Date(new Date(comment.createdAt).getTime() + editWindowHours * 60 * 60 * 1000);
    const canBypass = Boolean(userRecord?.canEditCommentsAfterDeadline) || isAdminRole(currentUser.role);
    if (!canBypass && deadline.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'The edit window for this comment has ended.' }, { status: 400 });
    }

    let scoreImpact = comment.scoreImpact;
    let nextStance: string | null | undefined = comment.stanceType;
    if (comment.commentKind === 'FIRST_COMMENT' && stanceType && COMMENT_STANCE_OPTIONS.includes(String(stanceType) as any)) {
      nextStance = String(stanceType);
      scoreImpact = getNumberSetting(settings, getCommentStanceWeightKey(nextStance as any), scoreImpact);
    }

    await prisma.artworkComment.update({
      where: { id },
      data: { body: cleanBody, stanceType: nextStance ?? null, scoreImpact },
    });
    await recalculateArtworkPremiumState(comment.artworkId);
    logger.info('Artwork comment edited', { commentId: id, userId: currentUser.userId });
    return NextResponse.json({ ok: true, message: 'Comment updated.' });
  } catch (error) {
    logger.error('Failed to edit artwork comment', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
