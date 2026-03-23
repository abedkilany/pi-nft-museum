import { NextResponse } from 'next/server';
import { getRequestIp, checkMultiRateLimit } from '@/lib/rate-limit';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getRequestOrigin(request: Request) {
  return request.headers.get('origin') || request.headers.get('referer') || '';
}

function getRequestDebugMeta(request: Request) {
  return {
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    host: request.headers.get('host'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    secFetchSite: request.headers.get('sec-fetch-site'),
    secFetchMode: request.headers.get('sec-fetch-mode'),
    xAppRequest: request.headers.get('x-app-request'),
  };
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

  const debug = getRequestDebugMeta(request);
  const origin = normalizeOrigin(getRequestOrigin(request));
  const expectedOrigin = normalizeOrigin(getExpectedOrigin(request));

  const xAppRequest = request.headers.get('x-app-request');
  const secFetchSite = (request.headers.get('sec-fetch-site') || '').toLowerCase();

  if (!origin) {
    if (xAppRequest === 'pi-web' || secFetchSite === 'same-origin' || secFetchSite === 'none') {
      return null;
    }

    return NextResponse.json({
      error: 'Missing request origin.',
      code: 'MISSING_REQUEST_ORIGIN',
      debug,
    }, { status: 403 });
  }

  if (!expectedOrigin || origin !== expectedOrigin) {
    return NextResponse.json({
      error: 'Cross-site request blocked.',
      code: 'CROSS_SITE_REQUEST_BLOCKED',
      debug: { ...debug, normalizedOrigin: origin, expectedOrigin },
    }, { status: 403 });
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
