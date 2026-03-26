import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';
import { trackAppEvent } from '@/lib/app-events';
import { getCurrentUser } from '@/lib/current-user';
import { mapSeverityFromStatus, recordErrorLog } from '@/lib/error-tracker';
import { getRequestContextFromHeaders } from '@/lib/request-context';
import { asFiniteNumber, asLimitedRecord, asLimitedString, asObject, enforceMaxContentLength } from '@/lib/telemetry-guards';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const payloadSizeError = enforceMaxContentLength(request, 96 * 1024);
  if (payloadSizeError) return payloadSizeError;

  try {
    const currentUser = await getCurrentUser();

    const rateLimitError = applyRateLimit(request, [currentUser?.userId ?? 'anon'], 'client-errors', [
      { limit: 20, windowMs: 60 * 1000 },
      { limit: 100, windowMs: 10 * 60 * 1000 },
    ]);
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => null);
    const payload = asObject(body);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    const ctx = getRequestContextFromHeaders(request.headers);
    const source = asLimitedString(payload.source, 32) === 'REACT' ? 'REACT' : 'CLIENT';
    const title = asLimitedString(payload.title, 180) || asLimitedString(payload.errorName, 180) || 'Client error';
    const message = asLimitedString(payload.message, 4000) || title;
    const route = asLimitedString(payload.route, 512);
    const method = asLimitedString(payload.method, 16);
    const url = asLimitedString(payload.url, 2000);
    const traceId = asLimitedString(payload.traceId, 180);
    const errorName = asLimitedString(payload.errorName, 180) || title;
    const code = asLimitedString(payload.code, 120);
    const stack = asLimitedString(payload.stack, 12000);
    const componentStack = asLimitedString(payload.componentStack, 12000);
    const readableSummary = asLimitedString(payload.readableSummary, 2000);
    const digest = asLimitedString(payload.digest, 180);
    const httpStatus = asFiniteNumber(payload.httpStatus);
    const tags = asLimitedRecord(payload.tags, { maxEntries: 16, maxDepth: 2, maxStringLength: 120 });
    const extra = asLimitedRecord(payload.extra, { maxEntries: 20, maxDepth: 3, maxStringLength: 400 });
    const sanitizedPayload = asLimitedRecord(payload, { maxEntries: 40, maxDepth: 3, maxStringLength: 500 }) || {};

    const eventId = Sentry.captureException(new Error(message), {
      tags: {
        source: source.toLowerCase(),
        route: String(route || url || 'unknown')
      },
      extra: sanitizedPayload,
      user: currentUser ? { id: String(currentUser.userId), username: currentUser.username, email: currentUser.email } : undefined
    });

    await trackAppEvent({
      category: 'ERROR',
      type: source === 'REACT' ? 'REACT_ERROR' : 'CLIENT_ERROR',
      name: title,
      status: 'FAILED',
      severity: mapSeverityFromStatus(httpStatus),
      isHealthy: false,
      source,
      route,
      method,
      url,
      userId: currentUser?.userId ?? null,
      requestId: ctx.requestId,
      traceId: traceId || ctx.traceId,
      correlationId: traceId || ctx.correlationId,
      errorName,
      errorCode: code,
      errorStack: stack,
      httpStatus,
      message,
      readableSummary,
      tags: { sentryEventId: eventId, source },
      data: sanitizedPayload,
    });

    await recordErrorLog({
      title,
      message,
      readableSummary,
      severity: mapSeverityFromStatus(httpStatus),
      source,
      runtime: 'browser',
      route,
      method,
      url,
      digest,
      errorName,
      stack,
      componentStack,
      code,
      httpStatus,
      userAgent: request.headers.get('user-agent'),
      ipAddress: ctx.ipAddress,
      requestId: ctx.requestId,
      sentryEventId: eventId,
      userId: currentUser?.userId ?? null,
      tags,
      extra,
      payload: sanitizedPayload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to record client error', error);
    return NextResponse.json({ error: 'Failed to record client error.' }, { status: 500 });
  }
}
