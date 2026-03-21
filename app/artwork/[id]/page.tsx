import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getBooleanSetting, getSiteSettingsMap } from '@/lib/site-settings';
import { getReviewStatuses } from '@/lib/artwork-workflow';
import { serializeArtworkDetail } from '@/lib/artwork-detail';
import ArtworkDetailClient from '@/components/artwork/ArtworkDetailClient';
import ArtworkPrivateAccessClient from '@/components/artwork/ArtworkPrivateAccessClient';

interface Props { params: { id: string } }

export default async function ArtworkDetailPage({ params }: Props) {
  const artworkId = Number(params.id);
  if (!artworkId) notFound();

  const [artwork, settings] = await Promise.all([
    prisma.artwork.findUnique({
      where: { id: artworkId },
      include: {
        artist: { include: { artistProfile: true } },
        category: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: true, commentLikes: { select: { userId: true } } },
        },
      },
    }),
    getSiteSettingsMap(),
  ]);

  if (!artwork) notFound();

  const reviewStatuses = getReviewStatuses(settings);
  const publicCanView =
    ['PUBLISHED', 'PREMIUM', 'SOLD'].includes(String(artwork.status)) ||
    reviewStatuses.includes(artwork.status as any);

  const commentsEnabled = getBooleanSetting(settings, 'comments_enabled', true);

  if (!publicCanView) {
    return <ArtworkPrivateAccessClient artworkId={artwork.id} />;
  }

  const artworkData = serializeArtworkDetail(artwork, null);
  const initialViewer = {
    authenticated: false,
    userId: null,
    role: null,
    isOwner: false,
    canReport: false,
    canComment: false,
    canModerate: false,
    canHide: false,
    paymentDisabled: true,
    paymentDisabledReason: 'Connect with Pi first to test payments.',
  };

  return <ArtworkDetailClient artwork={artworkData} initialViewer={initialViewer} />;
}
