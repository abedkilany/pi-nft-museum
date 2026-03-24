import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isTokenProtectedInternalRouteAuthorized } from '@/lib/api-guards';

export async function GET(request: Request) {
  if (!isTokenProtectedInternalRouteAuthorized(request, 'HEALTHCHECK_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: 'connected',
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
