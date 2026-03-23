import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const event = typeof body?.event === 'string' ? body.event : 'PI_CLIENT_DEBUG';
    const level = body?.level === 'warn' ? 'warn' : 'info';

    const meta = {
      ...((body?.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)) ? body.meta : {}),
      route: request.headers.get('referer') || null,
      origin: request.headers.get('origin'),
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      authMode: 'short-lived-app-session',
      clientDebug: true,
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
