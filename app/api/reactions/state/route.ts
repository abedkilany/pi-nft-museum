import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';

export async function GET(request: NextRequest) {
  const artworkId = Number(request.nextUrl.searchParams.get('artworkId'));
  if (!artworkId) {
    return NextResponse.json({ ok: false, error: 'artworkId is required.' }, { status: 400 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ ok: true, authenticated: false, myReaction: null });
  }

  const reaction = await prisma.artworkReaction.findUnique({
    where: {
      artworkId_userId: {
        artworkId,
        userId: currentUser.userId,
      },
    },
    select: { type: true },
  });

  return NextResponse.json({
    ok: true,
    authenticated: true,
    myReaction: reaction?.type ?? null,
  });
}
