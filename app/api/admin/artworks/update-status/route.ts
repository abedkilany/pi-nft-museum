import { type ArtworkStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { buildPublicReviewDates } from '@/lib/artwork-windows';
import { requireAdminApi } from '@/lib/admin';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { type AdminArtworkModerationStatus, type AdminArtworkStatusBody, ADMIN_ARTWORK_MODERATION_STATUSES } from '@/types/admin';

const ALLOWED_STATUSES = new Set<AdminArtworkModerationStatus>(ADMIN_ARTWORK_MODERATION_STATUSES);

function toArtworkStatus(status: AdminArtworkModerationStatus): ArtworkStatus {
  return status === 'APPROVED' ? 'PUBLIC_REVIEW' : status;
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  try {
    const body = (await request.json()) as AdminArtworkStatusBody;
    const artworkId = Number(body.artworkId);
    const status = String(body.status || '').trim() as AdminArtworkModerationStatus;
    const reviewNote = String(body.reviewNote || '').trim();
    if (!artworkId || !ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid artwork ID or status.' }, { status: 400 });
    if (status === 'REJECTED' && !reviewNote) return NextResponse.json({ error: 'Review note is required when rejecting an artwork.' }, { status: 400 });

    const currentArtwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
    if (!currentArtwork) return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });

    const publicReviewDates = status === 'APPROVED' ? await buildPublicReviewDates() : null;
    const artwork = await prisma.artwork.update({
      where: { id: artworkId },
      data: {
        status: toArtworkStatus(status),
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
        publicReviewStartedAt: publicReviewDates?.publicReviewStartedAt || null,
        mintWindowOpensAt: publicReviewDates?.mintWindowOpensAt || null,
        mintWindowEndsAt: publicReviewDates?.mintWindowEndsAt || null
      }
    });

    await createAuditLog({
      userId: admin.user.userId,
      action: 'ADMIN_ARTWORK_STATUS_UPDATED',
      targetType: 'ARTWORK',
      targetId: artwork.id,
      oldValues: { status: currentArtwork.status, reviewNote: currentArtwork.reviewNote },
      newValues: { requestedStatus: status, appliedStatus: artwork.status, reviewNote: reviewNote || null }
    });

    logger.info('Artwork status updated', { artworkId: artwork.id, newStatus: artwork.status, adminUserId: admin.user.userId });
    return NextResponse.json({ ok: true, artwork });
  } catch (error) {
    logger.error('Failed to update artwork status', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
