import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

function isAuthorized(request: Request) {
  const configuredSecret = process.env.HEALTHCHECK_SECRET;
  if (!configuredSecret) return true;
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const querySecret = new URL(request.url).searchParams.get('secret') || '';
  return bearer === configuredSecret || querySecret === configuredSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    await prisma.$queryRaw`SELECT 1`;
    const payload = { ok: true, database: 'connected', timestamp: new Date().toISOString() };
    logger.info('Health check success', payload);
    return NextResponse.json(payload);
  } catch (error) {
    logger.error('Health check failed', error);
    return NextResponse.json({ ok: false, database: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
