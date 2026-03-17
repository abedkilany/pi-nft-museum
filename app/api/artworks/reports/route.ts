import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { saveUploadedFile } from '@/lib/uploads';

const REPORT_THRESHOLD = 5;

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const formData = await request.formData();
    const artworkId = Number(formData.get('artworkId'));
    const reason = String(formData.get('reason') || '').trim() || 'OTHER';
    const description = String(formData.get('description') || '').trim();
    const originalWorkLink = String(formData.get('originalWorkLink') || '').trim();
    const evidenceLink = String(formData.get('evidenceLink') || '').trim();
    const contactEmail = String(formData.get('contactEmail') || '').trim();

    if (!artworkId || description.length < 10) {
      return NextResponse.json({ error: 'Please add enough details to review the report.' }, { status: 400 });
    }

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
    if (!artwork) return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    if (artwork.artistUserId === currentUser.userId) {
      return NextResponse.json({ error: 'You cannot report your own artwork.' }, { status: 400 });
    }

    const existingRecent = await prisma.artworkReport.findFirst({
      where: {
        artworkId,
        reporterId: currentUser.userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });
    if (existingRecent) {
      return NextResponse.json({ error: 'You already reported this artwork recently. Please wait before sending another report.' }, { status: 429 });
    }

    const files = formData.getAll('evidenceFiles').filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const savedFiles = [] as { url: string; originalName: string | null; mimeType: string | null }[];
    for (const file of files.slice(0, 5)) {
      const saved = await saveUploadedFile(file, {
        subdir: 'reports',
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
        maxSizeMb: 12
      });
      if (saved) savedFiles.push(saved);
    }

    const report = await prisma.artworkReport.create({
      data: {
        artworkId,
        reporterId: currentUser.userId,
        reason,
        description,
        originalWorkLink: originalWorkLink || null,
        evidenceLink: evidenceLink || null,
        contactEmail: contactEmail || null,
        evidenceFiles: {
          create: savedFiles.map((file) => ({
            fileUrl: file.url,
            originalName: file.originalName,
            mimeType: file.mimeType
          }))
        }
      },
      include: { evidenceFiles: true }
    });

    const reportCount = await prisma.artworkReport.count({ where: { artworkId, status: { not: 'REJECTED' } } });

    if (reportCount >= REPORT_THRESHOLD && artwork.status !== 'PENDING') {
      await prisma.$transaction([
        prisma.artwork.update({
          where: { id: artworkId },
          data: {
            statusBeforeModeration: artwork.status !== 'PENDING' ? artwork.status : artwork.statusBeforeModeration,
            status: 'PENDING',
            reviewNote: 'Temporarily hidden after receiving multiple user reports. Waiting for admin review.',
            reviewedAt: null,
            publicReviewStartedAt: null,
            mintWindowOpensAt: null,
            mintWindowEndsAt: null,
            publishedAt: null,
            mintedAt: null
          }
        }),
        prisma.artworkReport.updateMany({
          where: { artworkId, autoBlockedApplied: false },
          data: { autoBlockedApplied: true, status: 'UNDER_REVIEW' }
        }),
        prisma.notification.create({
          data: {
            userId: artwork.artistUserId,
            type: 'artwork_report_threshold',
            title: 'Artwork temporarily hidden for review',
            message: 'Your artwork was temporarily blocked after multiple reports and has been moved to pending review. The admin team will review it shortly.'
          }
        })
      ]);
      logger.warn('Artwork auto-hidden after report threshold', { artworkId, reportCount });
    }

    logger.warn('Artwork report created', { artworkId, reportId: report.id, reporterId: currentUser.userId, reportCount });
    return NextResponse.json({ ok: true, message: reportCount >= REPORT_THRESHOLD ? 'Report submitted. The artwork has reached the review threshold and was moved to pending review.' : 'Report submitted successfully. The admin team will review it.' });
  } catch (error) {
    logger.error('Failed to create artwork report', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
