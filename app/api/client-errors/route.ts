import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { trackAppEvent } from '@/lib/app-events';
import { getCurrentUser } from '@/lib/current-user';
import { mapSeverityFromStatus, recordErrorLog } from '@/lib/error-tracker';
import { getRequestContextFromHeaders } from '@/lib/request-context';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    const ctx = getRequestContextFromHeaders(request.headers);

    const eventId = Sentry.captureException(new Error(String(body.message || body.title || 'Client error')), {
      tags: {
        source: String(body.source || 'CLIENT').toLowerCase(),
        route: String(body.route || body.url || 'unknown')
      },
      extra: body as Record<string, unknown>,
      user: currentUser ? { id: String(currentUser.userId), username: currentUser.username, email: currentUser.email } : undefined
    });

    await trackAppEvent({
      category: 'ERROR',
      type: body.source === 'REACT' ? 'REACT_ERROR' : 'CLIENT_ERROR',
      name: String(body.title || body.errorName || 'CLIENT_ERROR'),
      status: 'FAILED',
      severity: mapSeverityFromStatus(typeof body.httpStatus === 'number' ? body.httpStatus : null),
      isHealthy: false,
      source: body.source === 'REACT' ? 'REACT' : 'CLIENT',
      route: typeof body.route === 'string' ? body.route : null,
      method: typeof body.method === 'string' ? body.method : null,
      url: typeof body.url === 'string' ? body.url : null,
      userId: currentUser?.userId ?? null,
      requestId: ctx.requestId,
      traceId: typeof body.traceId === 'string' ? body.traceId : ctx.traceId,
      correlationId: typeof body.traceId === 'string' ? body.traceId : ctx.correlationId,
      errorName: typeof body.errorName === 'string' ? body.errorName : String(body.title || 'ClientError'),
      errorCode: typeof body.code === 'string' ? body.code : null,
      errorStack: typeof body.stack === 'string' ? body.stack : null,
      httpStatus: typeof body.httpStatus === 'number' ? body.httpStatus : null,
      message: String(body.message || 'Unknown client error'),
      readableSummary: typeof body.readableSummary === 'string' ? body.readableSummary : null,
      tags: { sentryEventId: eventId, source: String(body.source || 'CLIENT') },
      data: body as Record<string, unknown>
    });

    await recordErrorLog({
      title: String(body.title || 'Client error'),
      message: String(body.message || 'Unknown client error'),
      readableSummary: typeof body.readableSummary === 'string' ? body.readableSummary : null,
      severity: mapSeverityFromStatus(typeof body.httpStatus === 'number' ? body.httpStatus : null),
      source: body.source === 'REACT' ? 'REACT' : 'CLIENT',
      runtime: 'browser',
      route: typeof body.route === 'string' ? body.route : null,
      method: typeof body.method === 'string' ? body.method : null,
      url: typeof body.url === 'string' ? body.url : null,
      digest: typeof body.digest === 'string' ? body.digest : null,
      errorName: typeof body.errorName === 'string' ? body.errorName : null,
      stack: typeof body.stack === 'string' ? body.stack : null,
      componentStack: typeof body.componentStack === 'string' ? body.componentStack : null,
      code: typeof body.code === 'string' ? body.code : null,
      httpStatus: typeof body.httpStatus === 'number' ? body.httpStatus : null,
      userAgent: request.headers.get('user-agent'),
      ipAddress: ctx.ipAddress,
      requestId: ctx.requestId,
      sentryEventId: eventId,
      userId: currentUser?.userId ?? null,
      tags: typeof body.tags === 'object' && body.tags ? body.tags as Record<string, unknown> : null,
      extra: typeof body.extra === 'object' && body.extra ? body.extra as Record<string, unknown> : null,
      payload: body as Record<string, unknown>
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to record client error', error);
    return NextResponse.json({ error: 'Failed to record client error.' }, { status: 500 });
  }
}
