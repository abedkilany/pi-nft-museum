import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';
import { resolveAuthenticatedUserFromHeaders } from '@/lib/bearer-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const authResult = await resolveAuthenticatedUserFromHeaders(new Headers(request.headers));
  if (authResult.user?.userId) {
    await prisma.user.update({
      where: { id: authResult.user.userId },
      data: { sessionVersion: { increment: 1 } },
    }).catch(() => null);
  }

  return NextResponse.json({ success: true, authMode: 'short-lived-app-session' });
}
