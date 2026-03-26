import { NextResponse } from 'next/server';
import { trackAppEvent } from '@/lib/app-events';
import { getCurrentUser } from '@/lib/current-user';
import { getRequestContextFromHeaders } from '@/lib/request-context';

function asObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const payload = asObject(body);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    const ctx = getRequestContextFromHeaders(request.headers);

    await trackAppEvent({
      eventKey: typeof payload.eventKey === 'string' ? payload.eventKey : null,
      category: typeof payload.category === 'string' ? payload.category : 'USER_ACTION',
      type: typeof payload.type === 'string' ? payload.type : 'CLIENT_EVENT',
      name: typeof payload.name === 'string' ? payload.name : 'CLIENT_EVENT',
      status: typeof payload.status === 'string' ? payload.status : 'SUCCESS',
      severity: typeof payload.severity === 'string' ? payload.severity : null,
      isHealthy: typeof payload.isHealthy === 'boolean' ? payload.isHealthy : true,
      message: typeof payload.message === 'string' ? payload.message : null,
      readableSummary: typeof payload.readableSummary === 'string' ? payload.readableSummary : null,
      source: typeof payload.source === 'string' ? payload.source : 'CLIENT',
      feature: typeof payload.feature === 'string' ? payload.feature : null,
      route: typeof payload.route === 'string' ? payload.route : null,
      method: typeof payload.method === 'string' ? payload.method : null,
      url: typeof payload.url === 'string' ? payload.url : null,
      component: typeof payload.component === 'string' ? payload.component : null,
      userId: currentUser?.userId ?? null,
      sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : ctx.sessionId,
      requestId: ctx.requestId,
      traceId: typeof payload.traceId === 'string' ? payload.traceId : ctx.traceId,
      spanId: typeof payload.spanId === 'string' ? payload.spanId : ctx.spanId,
      parentSpanId: typeof payload.parentSpanId === 'string' ? payload.parentSpanId : ctx.parentSpanId,
      correlationId: typeof payload.correlationId === 'string' ? payload.correlationId : ctx.correlationId,
      entityType: typeof payload.entityType === 'string' ? payload.entityType : null,
      entityId: typeof payload.entityId === 'string' || typeof payload.entityId === 'number' ? payload.entityId : null,
      parentType: typeof payload.parentType === 'string' ? payload.parentType : null,
      parentId: typeof payload.parentId === 'string' || typeof payload.parentId === 'number' ? payload.parentId : null,
      httpStatus: typeof payload.httpStatus === 'number' ? payload.httpStatus : null,
      durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : null,
      errorName: typeof payload.errorName === 'string' ? payload.errorName : null,
      errorCode: typeof payload.errorCode === 'string' ? payload.errorCode : null,
      errorStack: typeof payload.errorStack === 'string' ? payload.errorStack : null,
      fingerprint: typeof payload.fingerprint === 'string' ? payload.fingerprint : null,
      tags: asObject(payload.tags),
      data: asObject(payload.data)
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to track app event', error);
    return NextResponse.json({ error: 'Failed to track event.' }, { status: 500 });
  }
}
