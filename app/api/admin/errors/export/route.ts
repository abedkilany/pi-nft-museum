import { type ErrorSeverity, type ErrorSource, type ErrorStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/domains/admin';
import { prisma } from '@/lib/domains/system';
import { toCsvValue } from '@/lib/error-tracker';
import { ADMIN_ERROR_SEVERITIES, ADMIN_ERROR_SOURCES, ADMIN_ERROR_STATUSES } from '@/types/admin';

const ALLOWED_ERROR_STATUSES = new Set<ErrorStatus>(ADMIN_ERROR_STATUSES);
const ALLOWED_ERROR_SEVERITIES = new Set<ErrorSeverity>(ADMIN_ERROR_SEVERITIES);
const ALLOWED_ERROR_SOURCES = new Set<ErrorSource>(ADMIN_ERROR_SOURCES);

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

  if (status && ALLOWED_ERROR_STATUSES.has(status as ErrorStatus)) {
    where.status = status as ErrorStatus;
  }

  if (severity && ALLOWED_ERROR_SEVERITIES.has(severity as ErrorSeverity)) {
    where.severity = severity as ErrorSeverity;
  }

  if (source && ALLOWED_ERROR_SOURCES.has(source as ErrorSource)) {
    where.source = source as ErrorSource;
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
