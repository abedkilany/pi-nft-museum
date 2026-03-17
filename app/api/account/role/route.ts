import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { createSessionToken, getAuthCookieName } from '@/lib/auth';
import { logger } from '@/lib/logger';

const ALLOWED_ROLES = new Set(['visitor', 'trader', 'artist']);

function slugify(text: string) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'artist';
}

async function ensureUniqueArtistSlug(baseValue: string, userId: number) {
  const base = slugify(baseValue);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.artistProfile.findUnique({ where: { slug: candidate }, select: { userId: true } });
    if (!existing || existing.userId === userId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }

    const body = await request.json();
    const requestedRole = String(body.role || '').trim().toLowerCase();

    if (!ALLOWED_ROLES.has(requestedRole)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { key: requestedRole } });
    if (!role) {
      return NextResponse.json({ error: 'Requested role is not configured.' }, { status: 500 });
    }

    const current = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      include: { role: true, artistProfile: true }
    });

    if (!current) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (current.role.key === 'admin' || current.role.key === 'superadmin') {
      return NextResponse.json({ error: 'Staff roles cannot be changed from this screen.' }, { status: 403 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: current.id },
      data: { roleId: role.id },
      include: { role: true }
    });

    if (requestedRole === 'artist' && !current.artistProfile) {
      const displayName = current.fullName || current.piUsername || current.username;
      const slug = await ensureUniqueArtistSlug(current.piUsername || current.username, current.id);
      await prisma.artistProfile.create({
        data: {
          userId: current.id,
          displayName,
          slug,
          headline: current.headline || 'Pi Artist',
          biography: current.bio || null,
        }
      });
    }

    const token = await createSessionToken({
      userId: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role.key,
      piUid: updatedUser.piUid,
      piUsername: updatedUser.piUsername
    });

    const response = NextResponse.json({ ok: true, role: updatedUser.role.key });
    response.cookies.set(getAuthCookieName(), token, {
      httpOnly: true,
      sameSite: request.headers.get('origin')?.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https' ? 'none' : 'lax',
      secure: request.headers.get('origin')?.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    logger.info('Account role updated', { userId: updatedUser.id, role: updatedUser.role.key });
    return response;
  } catch (error) {
    logger.error('Failed to update account role', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
