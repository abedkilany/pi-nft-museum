import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';

function parseArtworkIds(value: string | null) {
  if (!value) return [] as number[];
  return Array.from(
    new Set(
      value
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ).slice(0, 100);
}

export async function GET(request: NextRequest) {
  const artworkIds = parseArtworkIds(request.nextUrl.searchParams.get('artworkIds'));
  if (artworkIds.length === 0) {
    return NextResponse.json({ ok: true, authenticated: false, reactions: {} });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser?.userId) {
    return NextResponse.json({ ok: true, authenticated: false, reactions: {} });
  }

  const reactions = await prisma.artworkReaction.findMany({
    where: {
      userId: currentUser.userId,
      artworkId: { in: artworkIds },
    },
    select: {
      artworkId: true,
      type: true,
    },
  });

  const reactionMap: Record<string, 'LIKE' | 'DISLIKE'> = {};
  for (const reaction of reactions) {
    reactionMap[String(reaction.artworkId)] = reaction.type;
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    reactions: reactionMap,
  });
}
