import { type ArtworkStatus, type PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { recalculateArtworkPremiumState } from '@/lib/comment-scoring';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { type AdminArtworkAction, type AdminCommentAction, type AdminReportStatus } from '@/types/admin';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const formData = await request.formData();
  const reportType = String(formData.get('reportType') || 'artwork');
  const reportId = Number(formData.get('reportId'));
  const status = String(formData.get('status') || 'PENDING') as AdminReportStatus;
  const adminNote = String(formData.get('adminNote') || '').trim();

  if (!reportId) {
    return NextResponse.redirect(new URL('/admin/reports', request.url));
  }

  if (reportType === 'comment') {
    const commentId = Number(formData.get('commentId'));
    const commentAction = String(formData.get('commentAction') || 'keep') as AdminCommentAction;
    const commentAuthorId = Number(formData.get('commentAuthorId'));
    const notifyAuthor = String(formData.get('notifyAuthor') || 'false') === 'true';

    const comment = await prisma.artworkComment.findUnique({ where: { id: commentId } });
    if (comment) {
      await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
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

    await createAuditLog({
      userId: admin.user.userId,
      action: 'ADMIN_COMMENT_REPORT_UPDATED',
      targetType: 'COMMENT_REPORT',
      targetId: reportId,
      newValues: { commentId, status, commentAction, adminNote: adminNote || null }
    });

    logger.info('Admin updated comment report', { adminUserId: admin.user.userId, reportId, commentId, status, commentAction });
    return NextResponse.redirect(new URL('/admin/reports', request.url));
  }

  const artworkId = Number(formData.get('artworkId'));
  const artworkAction = String(formData.get('artworkAction') || 'keep') as AdminArtworkAction;

  await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
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
          const restoredStatus = ((artwork.statusBeforeModeration as ArtworkStatus | null) ?? artwork.status ?? 'PENDING') as ArtworkStatus;
          await tx.artwork.update({
            where: { id: artworkId },
            data: {
              status: restoredStatus,
              statusBeforeModeration: null,
            },
          });
        }
      }
    }
  });

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_ARTWORK_REPORT_UPDATED',
    targetType: 'ARTWORK_REPORT',
    targetId: reportId,
    newValues: { artworkId, status, artworkAction, adminNote: adminNote || null }
  });

  logger.info('Admin updated artwork report', { adminUserId: admin.user.userId, reportId, artworkId, status, artworkAction });
  return NextResponse.redirect(new URL('/admin/reports', request.url));
}
