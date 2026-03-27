import { NextResponse } from 'next/server';
import { assertSameOrigin, applyRateLimit } from '@/lib/services/request';
import { logger } from '@/lib/domains/system';
import { getRequestContextFromHeaders } from '@/lib/request-context';
import { requireDebugRoute } from '@/lib/api-guards';
import { asLimitedRecord, asLimitedString, asObject, enforceMaxContentLength } from '@/lib/telemetry-guards';

export async function POST(request: Request) {
  
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }
const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const debugResponse = requireDebugRoute();
  if (debugResponse) {
    return debugResponse;
  }

  const payloadSizeError = enforceMaxContentLength(request, 16 * 1024);
  if (payloadSizeError) return payloadSizeError;

  const rateLimitError = applyRateLimit(request, ['pi-debug'], 'auth-pi-debug', [
    { limit: 10, windowMs: 60 * 1000 },
    { limit: 30, windowMs: 10 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json().catch(() => ({}));
    const payload = asObject(body) || {};
    const event = asLimitedString(payload.event, 120) || 'PI_CLIENT_DEBUG';
    const level = payload.level === 'warn' ? 'warn' : 'info';
    const ctx = getRequestContextFromHeaders(request.headers);
    const payloadMeta = asLimitedRecord(payload.meta, { maxEntries: 16, maxDepth: 2, maxStringLength: 200 }) || {};

    const meta = {
      ...payloadMeta,
      route: request.headers.get('referer') || null,
      origin: request.headers.get('origin'),
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      authMode: 'short-lived-app-session',
      clientDebug: true,
      feature: 'auth',
      requestId: ctx.requestId,
      traceId: ctx.traceId || (typeof payloadMeta.traceId === 'string' ? payloadMeta.traceId : null),
      correlationId: ctx.correlationId || (typeof payloadMeta.traceId === 'string' ? payloadMeta.traceId : null),
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
