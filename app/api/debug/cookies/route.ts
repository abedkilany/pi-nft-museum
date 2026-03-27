import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { extractBearerToken } from '@/lib/pi-session';
import { requireDebugRoute } from '@/lib/api-guards';
import { applyRateLimit } from '@/lib/services/request';

export async function GET(request: Request) {
  
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }
const debugResponse = requireDebugRoute();
  if (debugResponse) {
    return debugResponse;
  }

  const rateLimitError = applyRateLimit(request, ['debug-cookies'], 'debug-cookies', [
    { limit: 20, windowMs: 60 * 1000 },
    { limit: 60, windowMs: 10 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const headerStore = headers();
  const authorization = headerStore.get('authorization');
  const bearerToken = extractBearerToken(authorization);

  return NextResponse.json(
    {
      origin: headerStore.get('origin'),
      referer: headerStore.get('referer'),
      host: headerStore.get('host'),
      userAgent: headerStore.get('user-agent'),
      authHeaderPresent: Boolean(authorization),
      bearerTokenPresent: Boolean(bearerToken),
      authMode: 'token-only',
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
