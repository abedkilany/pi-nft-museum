'use client';

import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { RatingStars } from '@/components/ratings/RatingStars';

export function AuthAwareRatingStars({
  artworkId,
  currentAverage,
  currentVotes,
}: {
  artworkId: number;
  currentAverage: number;
  currentVotes: number;
}) {
  const { user, status } = usePiAuth();

  return (
    <RatingStars
      artworkId={artworkId}
      canRate={Boolean(user) && status === 'authenticated'}
      currentAverage={currentAverage}
      currentVotes={currentVotes}
    />
  );
}
