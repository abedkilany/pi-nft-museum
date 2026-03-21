import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { recalculateArtworkPremiumState } from '@/lib/comment-scoring';

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const formData = await request.formData();
  const reportType = String(formData.get('reportType') || 'artwork');
  const reportId = Number(formData.get('reportId'));
  const status = String(formData.get('status') || 'PENDING');
  const adminNote = String(formData.get('adminNote') || '').trim();

  if (!reportId) {
    return NextResponse.redirect(new URL('/admin/reports', request.url));
  }

  if (reportType === 'comment') {
    const commentId = Number(formData.get('commentId'));
    const commentAction = String(formData.get('commentAction') || 'keep');
    const commentAuthorId = Number(formData.get('commentAuthorId'));
    const notifyAuthor = String(formData.get('notifyAuthor') || 'false') === 'true';

    const comment = await prisma.artworkComment.findUnique({ where: { id: commentId } });
    if (comment) {
      await prisma.$transaction(async (tx: any) => {
        await tx.commentReport.update({
          where: { id: reportId },
          data: { status, adminNote: adminNote || null, reviewedById: admin.user.userId },
        });

        if (commentAction === 'remove_score_only') {
          await tx.artworkComment.update({ where: { id: commentId }, data: { scoreEffectEnabled: false } });
        } else if (commentAction === 'hide_and_remove_score') {
          await tx.artworkComment.update({ where: { id: commentId }, data: { scoreEffectEnabled: false, hiddenByModerator: true } });
        } else if (commentAction === 'delete') {
          await tx.artworkComment.delete({ where: { id: commentId } });
        }

        if (notifyAuthor && commentAuthorId) {
          await tx.notification.create({
            data: {
              userId: commentAuthorId,
              type: 'comment_moderation',
              title: 'A comment on your account was moderated',
              message: adminNote || 'A moderator reviewed your comment and changed its visibility or score contribution.',
            },
          });
        }
      });
      await recalculateArtworkPremiumState(comment.artworkId);
    }

    logger.info('Admin updated comment report', { adminUserId: admin.user.userId, reportId, commentId, status, commentAction });
    return NextResponse.redirect(new URL('/admin/reports', request.url));
  }

  const artworkId = Number(formData.get('artworkId'));
  const artworkAction = String(formData.get('artworkAction') || 'keep');

  await prisma.$transaction(async (tx: any) => {
    await tx.artworkReport.update({
      where: { id: reportId },
      data: {
        status,
        adminNote: adminNote || null,
        reviewedById: admin.user.userId,
      },
    });

    if (artworkId && artworkAction !== 'keep') {
      const artwork = await tx.artwork.findUnique({ where: { id: artworkId } });
      if (artwork) {
        if (artworkAction === 'pending') {
          await tx.artwork.update({
            where: { id: artworkId },
            data: {
              statusBeforeModeration: artwork.status !== 'PENDING' ? artwork.status : artwork.statusBeforeModeration,
              status: 'PENDING',
            },
          });
        } else if (artworkAction === 'review_again') {
          await tx.artwork.update({
            where: { id: artworkId },
            data: {
              status: 'PUBLIC_REVIEW',
              publicReviewStartedAt: new Date(),
              statusBeforeModeration: null,
            },
          });
        } else if (artworkAction === 'restore_previous') {
          await tx.artwork.update({
            where: { id: artworkId },
            data: {
              status: (artwork.statusBeforeModeration || artwork.status || 'PENDING') as any,
              statusBeforeModeration: null,
            },
          });
        }
      }
    }
  });

  logger.info('Admin updated artwork report', { adminUserId: admin.user.userId, reportId, artworkId, status, artworkAction });
  return NextResponse.redirect(new URL('/admin/reports', request.url));
}
