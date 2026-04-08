'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { AuthAwareReactionButtons } from '@/components/auth/AuthAwareReactionButtons';
import { piApiFetch } from '@/lib/pi-auth-client';

type GalleryArtwork = {
  id: number;
  likesCount: number;
  dislikesCount: number;
};

export function GalleryReactionButtons({ artwork }: { artwork: GalleryArtwork }) {
  const { status } = usePiAuth();
  const [myReaction, setMyReaction] = useState<'LIKE' | 'DISLIKE' | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      setMyReaction(null);
      return;
    }

    let cancelled = false;
    async function load() {
      const response = await piApiFetch(`/api/artworks/reaction-state?artworkIds=${artwork.id}`, { method: 'GET', cache: 'no-store' }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;
      if (!response?.ok || !payload?.ok) return;
      const nextReaction = payload?.reactions?.[String(artwork.id)];
      setMyReaction(nextReaction === 'LIKE' || nextReaction === 'DISLIKE' ? nextReaction : null);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [artwork.id, status]);

  const buttonProps = useMemo(() => ({
    artworkId: artwork.id,
    likesCount: artwork.likesCount,
    dislikesCount: artwork.dislikesCount,
    myReaction,
  }), [artwork.dislikesCount, artwork.id, artwork.likesCount, myReaction]);

  return <AuthAwareReactionButtons {...buttonProps} />;
}
