'use client';

import { useEffect, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { AuthAwareReactionButtons } from '@/components/auth/AuthAwareReactionButtons';
import { piApiFetch } from '@/lib/pi-auth-client';

export function PremiumReactionButtons({
  artworkId,
  likesCount,
  dislikesCount,
  premiumAllowDislike,
}: {
  artworkId: number;
  likesCount: number;
  dislikesCount: number;
  premiumAllowDislike: boolean;
}) {
  const { status } = usePiAuth();
  const [myReaction, setMyReaction] = useState<'LIKE' | 'DISLIKE' | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      setMyReaction(null);
      return;
    }

    let cancelled = false;
    async function load() {
      const response = await piApiFetch(`/api/artworks/reaction-state?artworkIds=${artworkId}`, { method: 'GET', cache: 'no-store' }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;
      if (!response?.ok || !payload?.ok) return;
      const nextReaction = payload?.reactions?.[String(artworkId)];
      setMyReaction(nextReaction === 'LIKE' || nextReaction === 'DISLIKE' ? nextReaction : null);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [artworkId, status]);

  return (
    <AuthAwareReactionButtons
      artworkId={artworkId}
      likesCount={likesCount}
      dislikesCount={dislikesCount}
      myReaction={myReaction}
      isPremium={true}
      premiumAllowDislike={premiumAllowDislike}
    />
  );
}
