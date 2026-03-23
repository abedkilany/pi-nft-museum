import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { mapSeverityFromStatus, recordErrorLog } from '@/lib/error-tracker';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();

    const eventId = Sentry.captureException(new Error(String(body.message || body.title || 'Client error')), {
      tags: {
        source: String(body.source || 'CLIENT').toLowerCase(),
        route: String(body.route || body.url || 'unknown')
      },
      extra: body as Record<string, unknown>,
      user: currentUser ? { id: String(currentUser.userId), username: currentUser.username, email: currentUser.email } : undefined
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
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      requestId: request.headers.get('x-vercel-id') || request.headers.get('x-request-id'),
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
