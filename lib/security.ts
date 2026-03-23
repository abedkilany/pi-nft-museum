import { NextResponse } from 'next/server';
import { getRequestIp, checkMultiRateLimit } from '@/lib/rate-limit';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getRequestOrigin(request: Request) {
  return request.headers.get('origin') || request.headers.get('referer') || '';
}

function getExpectedOrigin(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  const proto = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '') || 'https';
  return `${proto}://${host}`;
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

export function assertSameOrigin(request: Request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;

  const origin = normalizeOrigin(getRequestOrigin(request));
  if (!origin) {
    return NextResponse.json({ error: 'Missing request origin.' }, { status: 403 });
  }

  const expectedOrigin = normalizeOrigin(getExpectedOrigin(request));
  if (!expectedOrigin || origin !== expectedOrigin) {
    return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 });
  }

  return null;
}

export function applyRateLimit(request: Request, identity: Array<string | number | null | undefined>, scope: string, strategies: Array<{ limit: number; windowMs: number }>) {
  const ip = getRequestIp(request);
  const result = checkMultiRateLimit({
    keyParts: [scope, ip, ...identity],
    strategies: strategies.map((strategy, index) => ({ ...strategy, scope: `${scope}:${index}` })),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))),
        },
      },
    );
  }

  return null;
}
