import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_DEVICE_REQUIRED_PATH, issueAdminBridgeToken, resolveAdminHandoffToken, isSecureAdminDevice } from '@/lib/domains/admin';
import { setAdminBridgeCookie } from '@/lib/auth-cookies';
import { prisma } from '@/lib/domains/system';

export const dynamic = 'force-dynamic';

function buildUnauthorizedRedirect(request: NextRequest) {
  const targetUrl = new URL(ADMIN_DEVICE_REQUIRED_PATH, request.url);
  targetUrl.searchParams.set('reason', 'admin_handoff_failed');
  return NextResponse.redirect(targetUrl, { status: 303 });
}

async function consumeGrant(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  if (request.method === 'POST') {
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const rawGrant = formData.get('grant');
      return typeof rawGrant === 'string' ? rawGrant.trim() : '';
    }

    try {
      const body = await request.json();
      return typeof body?.grant === 'string' ? body.grant.trim() : '';
    } catch {
      return '';
    }
  }

  return request.nextUrl.searchParams.get('grant')?.trim() || '';
}

async function handleHandoff(request: NextRequest) {
  if (!(await isSecureAdminDevice())) return buildUnauthorizedRedirect(request);

  const grant = await consumeGrant(request);
  if (!grant) return buildUnauthorizedRedirect(request);

  const user = await resolveAdminHandoffToken(grant).catch(() => null);
  if (!user) return buildUnauthorizedRedirect(request);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: { role: true },
  });
  if (!dbUser) return buildUnauthorizedRedirect(request);

  const bridgeToken = await issueAdminBridgeToken({
    userId: dbUser.id,
    role: dbUser.role.key,
    piUid: dbUser.piUid,
    piUsername: dbUser.piUsername,
    sessionVersion: dbUser.sessionVersion,
    roleVersion: dbUser.roleVersion,
    expiresInSeconds: 5 * 60,
  }).catch(() => null);

  if (!bridgeToken) return buildUnauthorizedRedirect(request);

  const adminUrl = new URL('/admin', request.url);
  const response = NextResponse.redirect(adminUrl, { status: 303 });
  setAdminBridgeCookie(response, bridgeToken, request);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function GET(request: NextRequest) {
  return handleHandoff(request);
}

export async function POST(request: NextRequest) {
  return handleHandoff(request);
}
