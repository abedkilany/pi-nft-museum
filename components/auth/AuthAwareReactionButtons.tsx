'use client';

import { useEffect, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { ReactionButtons } from '@/components/reactions/ReactionButtons';
import { piApiFetch } from '@/lib/pi-auth-client';

export function AuthAwareReactionButtons({
  artworkId,
  likesCount,
  dislikesCount,
  myReaction = null,
  isPremium = false,
  premiumAllowDislike = false,
}: {
  artworkId: number;
  likesCount: number;
  dislikesCount: number;
  myReaction?: 'LIKE' | 'DISLIKE' | null;
  isPremium?: boolean;
  premiumAllowDislike?: boolean;
}) {
  const { user, status } = usePiAuth();
  const [resolvedReaction, setResolvedReaction] = useState<'LIKE' | 'DISLIKE' | null>(myReaction);

  useEffect(() => {
    setResolvedReaction(myReaction);
  }, [myReaction]);

  useEffect(() => {
    let active = true;

    if (status !== 'authenticated' || !user) {
      setResolvedReaction(null);
      return () => {
        active = false;
      };
    }

    if (myReaction) {
      return () => {
        active = false;
      };
    }

    (async () => {
      const response = await piApiFetch(`/api/reactions/state?artworkId=${artworkId}`, {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);
      const data = response ? await response.json().catch(() => null) : null;
      if (!active || !response?.ok || !data?.ok) return;
      setResolvedReaction((data.myReaction ?? null) as 'LIKE' | 'DISLIKE' | null);
    })();

    return () => {
      active = false;
    };
  }, [artworkId, myReaction, status, user]);

  return (
    <ReactionButtons
      artworkId={artworkId}
      canReact={Boolean(user) && status === 'authenticated'}
      likesCount={likesCount}
      dislikesCount={dislikesCount}
      myReaction={resolvedReaction}
      isPremium={isPremium}
      premiumAllowDislike={premiumAllowDislike}
    />
  );
}
