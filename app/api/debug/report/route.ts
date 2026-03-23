import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/current-user';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);
    const currentUser = await getCurrentUser();

    logger.error('CLIENT_RUNTIME_ERROR', {
      source: 'browser',
      userId: currentUser?.userId ?? null,
      username: currentUser?.username ?? null,
      path: payload?.path ?? null,
      message: payload?.message ?? 'Unknown client error',
      type: payload?.type ?? 'client-error',
      stack: payload?.stack ?? null,
      detail: payload?.detail ?? null,
      occurredAt: payload?.occurredAt ?? new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
