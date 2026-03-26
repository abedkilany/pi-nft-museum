import { NextResponse } from 'next/server';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';
import { trackAppEvent } from '@/lib/app-events';
import { getCurrentUser } from '@/lib/current-user';
import { getRequestContextFromHeaders } from '@/lib/request-context';
import { asFiniteNumber, asLimitedRecord, asLimitedString, asObject, enforceMaxContentLength } from '@/lib/telemetry-guards';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const payloadSizeError = enforceMaxContentLength(request, 64 * 1024);
  if (payloadSizeError) return payloadSizeError;

  try {
    const currentUser = await getCurrentUser();

    const rateLimitError = applyRateLimit(request, [currentUser?.userId ?? 'anon'], 'app-events', [
      { limit: 40, windowMs: 60 * 1000 },
      { limit: 200, windowMs: 10 * 60 * 1000 },
    ]);
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => null);
    const payload = asObject(body);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    const ctx = getRequestContextFromHeaders(request.headers);

    await trackAppEvent({
      eventKey: asLimitedString(payload.eventKey, 180),
      category: asLimitedString(payload.category, 80) || 'USER_ACTION',
      type: asLimitedString(payload.type, 80) || 'CLIENT_EVENT',
      name: asLimitedString(payload.name, 180) || 'CLIENT_EVENT',
      status: asLimitedString(payload.status, 40) || 'SUCCESS',
      severity: asLimitedString(payload.severity, 32),
      isHealthy: typeof payload.isHealthy === 'boolean' ? payload.isHealthy : true,
      message: asLimitedString(payload.message, 2000),
      readableSummary: asLimitedString(payload.readableSummary, 1200),
      source: asLimitedString(payload.source, 32) || 'CLIENT',
      feature: asLimitedString(payload.feature, 80),
      route: asLimitedString(payload.route, 512),
      method: asLimitedString(payload.method, 16),
      url: asLimitedString(payload.url, 2000),
      component: asLimitedString(payload.component, 120),
      userId: currentUser?.userId ?? null,
      sessionId: asLimitedString(payload.sessionId, 180) || ctx.sessionId,
      requestId: ctx.requestId,
      traceId: asLimitedString(payload.traceId, 180) || ctx.traceId,
      correlationId: asLimitedString(payload.correlationId, 180) || ctx.correlationId,
      entityType: asLimitedString(payload.entityType, 80),
      entityId: typeof payload.entityId === 'string' || typeof payload.entityId === 'number' ? payload.entityId : null,
      parentType: asLimitedString(payload.parentType, 80),
      parentId: typeof payload.parentId === 'string' || typeof payload.parentId === 'number' ? payload.parentId : null,
      httpStatus: asFiniteNumber(payload.httpStatus),
      durationMs: asFiniteNumber(payload.durationMs),
      errorName: asLimitedString(payload.errorName, 180),
      errorCode: asLimitedString(payload.errorCode, 120),
      errorStack: asLimitedString(payload.errorStack, 12000),
      fingerprint: asLimitedString(payload.fingerprint, 180),
      tags: asLimitedRecord(payload.tags, { maxEntries: 16, maxDepth: 2, maxStringLength: 120 }),
      data: asLimitedRecord(payload.data, { maxEntries: 24, maxDepth: 3, maxStringLength: 400 }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to track app event', error);
    return NextResponse.json({ error: 'Failed to track event.' }, { status: 500 });
  }
}
