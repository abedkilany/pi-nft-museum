import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = extractBearerToken(authHeader) || request.headers.get('x-auth-token');

    if (!bearerToken) {
      return NextResponse.json(
        { ok: false, authenticated: false, reason: 'NO_TOKEN' },
        { status: 401 },
      );
    }

    const session = await resolvePiSessionFromToken(bearerToken).catch(() => null);
    if (!session) {
      return NextResponse.json(
        { ok: false, authenticated: false, reason: 'INVALID_OR_UNKNOWN_PI_USER' },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role.key,
        piUid: session.user.piUid,
        piUsername: session.user.piUsername,
      },
      source: 'pi-access-token',
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, authenticated: false, reason: 'SERVER_ERROR', error: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 },
    );
  }
}
