import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';

export async function GET() {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const [artworkReports, commentReports] = await Promise.all([
    prisma.artworkReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        artwork: { include: { artist: true } },
        reporter: true,
        reviewedBy: true,
        evidenceFiles: true,
      },
    }),
    prisma.commentReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        comment: { include: { artwork: true, author: true } },
        reporter: true,
        reviewedBy: true,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, data: { artworkReports, commentReports } });
}
