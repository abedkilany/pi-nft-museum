import { NextRequest, NextResponse } from 'next/server'
import { trackAppEvent } from '@/lib/app-events'
import { getRequestContextFromHeaders } from '@/lib/request-context'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const ctx = getRequestContextFromHeaders(req.headers)

    await trackAppEvent({
      eventKey: typeof body.type === 'string' ? body.type : 'LEGACY_TRACK',
      category: 'USER_ACTION',
      type: 'LEGACY_TRACK',
      name: typeof body.type === 'string' ? body.type : 'LEGACY_TRACK',
      status: 'SUCCESS',
      source: 'CLIENT',
      route: typeof body.path === 'string' ? body.path : null,
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : ctx.sessionId,
      requestId: ctx.requestId,
      traceId: ctx.traceId,
      spanId: ctx.spanId,
      parentSpanId: ctx.parentSpanId,
      correlationId: ctx.correlationId,
      data: typeof body.data === 'object' && body.data && !Array.isArray(body.data) ? body.data as Record<string, unknown> : null,
    })

    return NextResponse.json({ ok: true, migrated: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
