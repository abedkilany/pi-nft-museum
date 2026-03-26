import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { saveUploadedFile } from '@/lib/uploads';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { isValidPublicUrl, validateEmail } from '@/lib/validators';

const REPORT_THRESHOLD = 5;
const ALLOWED_REASONS = new Set(['COPYRIGHT', 'PLAGIARISM', 'SPAM', 'OFFENSIVE', 'SCAM', 'OTHER']);

export async function POST(request: Request) {
  try {
    const csrfError = assertSameOrigin(request);
    if (csrfError) return csrfError;

    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const rateLimitError = applyRateLimit(request, [currentUser.userId], 'artwork-report', [
      { limit: 3, windowMs: 15 * 60 * 1000 },
      { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
    ]);
    if (rateLimitError) return rateLimitError;

    const formData = await request.formData();
    const artworkId = Number(formData.get('artworkId'));
    const reason = String(formData.get('reason') || '').trim().toUpperCase() || 'OTHER';
    const description = String(formData.get('description') || '').trim();
    const originalWorkLink = String(formData.get('originalWorkLink') || '').trim();
    const evidenceLink = String(formData.get('evidenceLink') || '').trim();
    const contactEmail = String(formData.get('contactEmail') || '').trim();

    if (!artworkId || description.length < 10 || description.length > 4000) {
      return NextResponse.json({ error: 'Please add enough details to review the report.' }, { status: 400 });
    }
    if (!ALLOWED_REASONS.has(reason)) {
      return NextResponse.json({ error: 'Invalid report reason.' }, { status: 400 });
    }
    if (originalWorkLink && !isValidPublicUrl(originalWorkLink)) {
      return NextResponse.json({ error: 'Original work link is invalid.' }, { status: 400 });
    }
    if (evidenceLink && !isValidPublicUrl(evidenceLink)) {
      return NextResponse.json({ error: 'Evidence link is invalid.' }, { status: 400 });
    }
    if (contactEmail && !validateEmail(contactEmail)) {
      return NextResponse.json({ error: 'Contact email is invalid.' }, { status: 400 });
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
        status: 'UNDER_REVIEW',
        evidenceFiles: {
          create: savedFiles.map((file: any) => ({
            fileUrl: file.url,
            originalName: file.originalName,
            mimeType: file.mimeType
          }))
        }
      },
      include: { evidenceFiles: true }
    });

    const reportCount = await prisma.artworkReport.count({ where: { artworkId, status: { not: 'REJECTED' } } });

    if (reportCount >= REPORT_THRESHOLD) {
      await prisma.notification.create({
        data: {
          userId: artwork.artistUserId,
          type: 'artwork_report_threshold',
          title: 'Artwork queued for moderation review',
          message: 'Your artwork received multiple reports and has been queued for manual admin review. It has not been auto-hidden.',
        }
      });
      logger.warn('Artwork reached report threshold and was queued for manual review', { artworkId, reportCount });
    }

    await createAuditLog({
      userId: currentUser.userId,
      action: 'ARTWORK_REPORTED',
      targetType: 'ARTWORK',
      targetId: artworkId,
      newValues: { reportId: report.id, reason, reportCount },
    });

    logger.warn('Artwork report created', { artworkId, reportId: report.id, reporterId: currentUser.userId, reportCount });
    return NextResponse.json({ ok: true, message: reportCount >= REPORT_THRESHOLD ? 'Report submitted. The artwork was queued for manual admin review.' : 'Report submitted successfully. The admin team will review it.' });
  } catch (error) {
    logger.error('Failed to create artwork report', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
