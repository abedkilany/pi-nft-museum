import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';

const ALLOWED_ROLES = new Set(['visitor', 'artist_or_trader']);

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
    const csrfError = assertSameOrigin(request);
    if (csrfError) return csrfError;

    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }

    const rateLimitError = applyRateLimit(request, [sessionUser.userId], 'account-role', [
      { limit: 5, windowMs: 10 * 60 * 1000 },
      { limit: 10, windowMs: 60 * 60 * 1000 },
    ]);
    if (rateLimitError) return rateLimitError;

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

    if (requestedRole === 'artist_or_trader' && !current.artistProfile) {
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

    await createAuditLog({
      userId: updatedUser.id,
      action: 'ACCOUNT_ROLE_CHANGED',
      targetType: 'USER',
      targetId: updatedUser.id,
      oldValues: { role: current.role.key },
      newValues: { role: updatedUser.role.key },
    });

    logger.info('Account role updated', { userId: updatedUser.id, role: updatedUser.role.key });
    return NextResponse.json({ ok: true, role: updatedUser.role.key });
  } catch (error) {
    logger.error('Failed to update account role', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
