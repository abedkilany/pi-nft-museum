import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';
import { logger } from '@/lib/logger';
import { getRequestContextFromHeaders } from '@/lib/request-context';
import { requireDebugRoute } from '@/lib/api-guards';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const debugResponse = requireDebugRoute();
  if (debugResponse) {
    return debugResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const event = typeof body?.event === 'string' ? body.event : 'PI_CLIENT_DEBUG';
    const level = body?.level === 'warn' ? 'warn' : 'info';
    const ctx = getRequestContextFromHeaders(request.headers);

    const meta = {
      ...((body?.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)) ? body.meta : {}),
      route: request.headers.get('referer') || null,
      origin: request.headers.get('origin'),
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      authMode: 'short-lived-app-session',
      clientDebug: true,
      feature: 'auth',
      requestId: ctx.requestId,
      traceId: ctx.traceId || (typeof body?.meta?.traceId === 'string' ? body.meta.traceId : null),
      correlationId: ctx.correlationId || (typeof body?.meta?.traceId === 'string' ? body.meta.traceId : null),
      sessionId: ctx.sessionId || null,
      ipAddress: ctx.ipAddress || null,
    };

    if (level === 'warn') {
      logger.warn(event, meta);
    } else {
      logger.info(event, meta);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn('PI_CLIENT_DEBUG_LOG_FAILED', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
