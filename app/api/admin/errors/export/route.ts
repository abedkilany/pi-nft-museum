import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { toCsvValue } from '@/lib/error-tracker';

function buildWhere(searchParams: URLSearchParams): Prisma.ErrorLogWhereInput {
  const where: Prisma.ErrorLogWhereInput = {};
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const source = searchParams.get('source');
  const q = searchParams.get('q');

  if (id && Number.isFinite(Number(id))) {
    where.id = Number(id);
  }

  if (status && ['OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED'].includes(status)) {
    where.status = status as any;
  }

  if (severity && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
    where.severity = severity as any;
  }

  if (source && ['API', 'SERVER', 'CLIENT', 'REACT', 'MIDDLEWARE', 'CRON', 'UNKNOWN'].includes(source)) {
    where.source = source as any;
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { message: { contains: q, mode: 'insensitive' } },
      { route: { contains: q, mode: 'insensitive' } },
      { fingerprint: { contains: q, mode: 'insensitive' } }
    ];
  }

  return where;
}

export async function GET(request: Request) {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const url = new URL(request.url);
  const format = (url.searchParams.get('format') || 'json').toLowerCase();
  const where = buildWhere(url.searchParams);

  const rows = await prisma.errorLog.findMany({
    where,
    include: { user: { select: { id: true, username: true, email: true } } },
    orderBy: { lastSeenAt: 'desc' },
    take: 5000
  });

  if (format === 'csv') {
    const headers = [
      'id','status','severity','source','title','message','route','method','occurrenceCount','firstSeenAt','lastSeenAt','environment','release','userId','username','email','sentryEventId','fingerprint'
    ];
    const lines = [
      headers.join(','),
      ...rows.map((row) => [
        row.id,
        row.status,
        row.severity,
        row.source,
        toCsvValue(row.title),
        toCsvValue(row.message),
        toCsvValue(row.route || row.url),
        toCsvValue(row.method),
        row.occurrenceCount,
        row.firstSeenAt.toISOString(),
        row.lastSeenAt.toISOString(),
        toCsvValue(row.environment),
        toCsvValue(row.release),
        row.user?.id ?? '',
        toCsvValue(row.user?.username ?? ''),
        toCsvValue(row.user?.email ?? ''),
        toCsvValue(row.sentryEventId),
        toCsvValue(row.fingerprint)
      ].join(','))
    ].join('\n');

    return new NextResponse(lines, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="error-report-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    total: rows.length,
    rows
  }, {
    headers: {
      'content-disposition': `attachment; filename="error-report-${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
}
