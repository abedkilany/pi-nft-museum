import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerEnvSummary } from '@/lib/env';
import { safeAppEventQuery } from '@/lib/app-events';
import { isTokenProtectedInternalRouteAuthorized } from '@/lib/api-guards';

export async function GET(request: Request) {
  if (!isTokenProtectedInternalRouteAuthorized(request, 'HEALTHCHECK_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    const [appEventsCount, openErrorsCount] = await Promise.all([
      safeAppEventQuery(() => prisma.appEvent.count(), 0),
      prisma.errorLog.count({ where: { status: { in: ['OPEN', 'INVESTIGATING'] } } }).catch(() => 0)
    ]);

    return NextResponse.json({
      ok: true,
      database: 'connected',
      environment: getServerEnvSummary(),
      appEventsCount,
      openErrorsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
