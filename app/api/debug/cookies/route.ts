import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { extractBearerToken } from '@/lib/pi-session';
import { requireDebugRoute } from '@/lib/api-guards';

export async function GET() {
  const debugResponse = requireDebugRoute();
  if (debugResponse) {
    return debugResponse;
  }

  const headerStore = headers();
  const authorization = headerStore.get('authorization');
  const bearerToken = extractBearerToken(authorization);

  return NextResponse.json({
    origin: headerStore.get('origin'),
    referer: headerStore.get('referer'),
    host: headerStore.get('host'),
    userAgent: headerStore.get('user-agent'),
    authHeaderPresent: Boolean(authorization),
    bearerTokenPresent: Boolean(bearerToken),
    authMode: 'token-only',
  });
}
