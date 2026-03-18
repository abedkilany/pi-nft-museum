import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { COMMENT_STANCE_OPTIONS, getCommentScoreImpact, recalculateArtworkPremiumState } from '@/lib/comment-scoring';
import { createCommunityActivity } from '@/lib/community';
import { createNotification } from '@/lib/notifications';
import { getBooleanSetting, getNumberSetting, getSiteSettingsMap } from '@/lib/site-settings';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const { artworkId, body, stanceType, parentId } = await request.json();
    const cleanBody = String(body || '').trim();
    const id = Number(artworkId);
    const replyToId = parentId ? Number(parentId) : null;
    if (!id || cleanBody.length < 2) return NextResponse.json({ error: 'Comment is too short.' }, { status: 400 });

    const settings = await getSiteSettingsMap();
    if (!getBooleanSetting(settings, 'comments_enabled', true)) {
      return NextResponse.json({ error: 'Comments are currently disabled.' }, { status: 400 });
    }

    const artwork = await prisma.artwork.findUnique({ where: { id } });
    if (!artwork) return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });

    const existingFirstComment = await prisma.artworkComment.findFirst({
      where: { artworkId: id, authorId: currentUser.userId, commentKind: 'FIRST_COMMENT' },
      orderBy: { createdAt: 'asc' },
    });

    const isReply = Boolean(existingFirstComment) || Boolean(replyToId);
    if (!isReply && !COMMENT_STANCE_OPTIONS.includes(String(stanceType || '') as any)) {
      return NextResponse.json({ error: 'Choose a reason for your first comment.' }, { status: 400 });
    }

    let parentComment: any = null;
    if (replyToId) {
      parentComment = await prisma.artworkComment.findUnique({ where: { id: replyToId } });
      if (!parentComment || parentComment.artworkId !== id) {
        return NextResponse.json({ error: 'Reply target not found.' }, { status: 404 });
      }
    } else if (existingFirstComment) {
      parentComment = existingFirstComment;
    }

    const scoreImpact = await getCommentScoreImpact({
      artworkId: id,
      authorId: currentUser.userId,
      isArtistReply: artwork.artistUserId === currentUser.userId,
      stanceType: isReply ? null : String(stanceType),
      isReply,
    });

    const editWindowHours = getNumberSetting(settings, 'comment_edit_window_hours', 12);
    const editLockedAt = new Date(Date.now() + Math.max(0, editWindowHours) * 60 * 60 * 1000);

    const created = await prisma.artworkComment.create({
      data: {
        artworkId: id,
        authorId: currentUser.userId,
        parentId: parentComment?.id || null,
        commentKind: isReply ? (artwork.artistUserId === currentUser.userId ? 'ARTIST_REPLY' : 'REPLY') : 'FIRST_COMMENT',
        stanceType: isReply ? null : String(stanceType),
        body: cleanBody,
        scoreImpact,
        editLockedAt,
      },
    });

    const recalculated = await recalculateArtworkPremiumState(id);

    const activityPromises: Promise<unknown>[] = [
      createCommunityActivity({
        actorId: currentUser.userId,
        subjectUserId: artwork.artistUserId,
        type: parentComment ? 'REPLY' : 'COMMENT',
        title: parentComment ? 'Replied to a comment' : 'Commented on artwork',
        message: parentComment ? `@${currentUser.username} replied in an artwork discussion.` : `@${currentUser.username} joined an artwork discussion.`,
        linkUrl: `/artwork/${id}`,
      }),
    ];

    if (parentComment && parentComment.authorId !== currentUser.userId) {
      activityPromises.push(
        createNotification({
          userId: parentComment.authorId,
          type: 'REPLY',
          title: 'New reply',
          message: `@${currentUser.username} replied to your comment.`,
          linkUrl: `/artwork/${id}`,
        }),
      );
    }
    if (artwork.artistUserId !== currentUser.userId) {
      activityPromises.push(
        createNotification({
          userId: artwork.artistUserId,
          type: 'COMMENT',
          title: 'New artwork comment',
          message: `@${currentUser.username} commented on your artwork.`,
          linkUrl: `/artwork/${id}`,
        }),
      );
    }

    await Promise.all(activityPromises);

    logger.info('Artwork comment created', { artworkId: id, userId: currentUser.userId, commentId: created.id, scoreImpact });
    return NextResponse.json({ ok: true, message: 'Comment added.', commentId: created.id, premiumScore: recalculated?.premiumScore || 0 });
  } catch (error) {
    logger.error('Failed to create artwork comment', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
