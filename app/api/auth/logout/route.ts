import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const token = extractBearerToken(request.headers.get('authorization'));
  if (token) {
    const session = await resolvePiSessionFromToken(token).catch(() => null);
    if (session?.user?.id) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { sessionVersion: { increment: 1 } },
      }).catch(() => null);
    }
  }

  return NextResponse.json({ success: true, authMode: 'short-lived-app-session' });
}
