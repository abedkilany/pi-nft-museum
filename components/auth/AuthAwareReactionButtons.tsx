'use client';

import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { ReactionButtons } from '@/components/reactions/ReactionButtons';

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

  return (
    <ReactionButtons
      artworkId={artworkId}
      canReact={Boolean(user) && status === 'authenticated'}
      likesCount={likesCount}
      dislikesCount={dislikesCount}
      myReaction={myReaction}
      isPremium={isPremium}
      premiumAllowDislike={premiumAllowDislike}
    />
  );
}
