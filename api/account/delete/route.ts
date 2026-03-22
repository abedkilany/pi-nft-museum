
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { getAuthCookieName } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const artworks = await prisma.artwork.findMany({ where: { artistUserId: user.id }, select: { id: true } });
    const artworkIds = artworks.map((item: any) => item.id);

    await prisma.$transaction(async (tx: any) => {
      if (artworkIds.length > 0) {
        await tx.artworkComment.deleteMany({ where: { artworkId: { in: artworkIds } } });
        await tx.rating.deleteMany({ where: { artworkId: { in: artworkIds } } });
        await tx.favorite.deleteMany({ where: { artworkId: { in: artworkIds } } });
        await tx.artworkReaction.deleteMany({ where: { artworkId: { in: artworkIds } } });
        await tx.artwork.deleteMany({ where: { id: { in: artworkIds } } });
      }
      await tx.artworkComment.deleteMany({ where: { authorId: user.id } });
      await tx.rating.deleteMany({ where: { userId: user.id } });
      await tx.favorite.deleteMany({ where: { userId: user.id } });
      await tx.artworkReaction.deleteMany({ where: { userId: user.id } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.communityPost.deleteMany({ where: { authorId: user.id } });
      await tx.artistProfile.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });

    logger.warn('User deleted account', { userId: currentUser.userId, username: currentUser.username });
    const response = NextResponse.json({ ok: true, message: 'Account deleted.' });
    response.cookies.set(getAuthCookieName(), '', { path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    logger.error('Account deletion failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}