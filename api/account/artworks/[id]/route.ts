import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await context.params;
  const artworkId = Number(id);

  const [artwork, categories] = await Promise.all([
    prisma.artwork.findUnique({ where: { id: artworkId }, include: { category: true } }),
    prisma.artworkCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true } })
  ]);

  if (!artwork) {
    return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
  }

  if (artwork.artistUserId !== currentUser.userId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  return NextResponse.json({ ok: true, artwork, categories });
}
