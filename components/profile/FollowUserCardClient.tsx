'use client';

import { useEffect, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { FollowUserCard } from '@/components/community/FollowUserCard';
import { piApiFetch } from '@/lib/pi-auth-client';

type CardUser = {
  id: number;
  username: string;
  fullName: string | null;
  headline: string | null;
  profileImage: string | null;
};

type ViewerState = {
  isFollowing: boolean;
  followsYou: boolean;
  isSelf: boolean;
};

export function FollowUserCardClient({
  user,
  initialIsFollowing = false,
  initialFollowsYou = false,
  initialIsSelf = false,
}: {
  user: CardUser;
  initialIsFollowing?: boolean;
  initialFollowsYou?: boolean;
  initialIsSelf?: boolean;
}) {
  const { status } = usePiAuth();
  const [viewerState, setViewerState] = useState<ViewerState>({
    isFollowing: initialIsFollowing,
    followsYou: initialFollowsYou,
    isSelf: initialIsSelf,
  });

  useEffect(() => {
    setViewerState({
      isFollowing: initialIsFollowing,
      followsYou: initialFollowsYou,
      isSelf: initialIsSelf,
    });
  }, [initialFollowsYou, initialIsFollowing, initialIsSelf]);

  useEffect(() => {
    let active = true;

    if (status !== 'authenticated') {
      setViewerState({
        isFollowing: false,
        followsYou: false,
        isSelf: false,
      });
      return () => {
        active = false;
      };
    }

    (async () => {
      const response = await piApiFetch(`/api/profile/viewer-state?username=${encodeURIComponent(user.username)}`, {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);

      const data = response ? await response.json().catch(() => null) : null;
      if (!active || !response?.ok || !data?.ok) return;

      setViewerState({
        isFollowing: Boolean(data.isFollowing),
        followsYou: Boolean(data.followsYou),
        isSelf: Boolean(data.isSelf),
      });
    })();

    return () => {
      active = false;
    };
  }, [status, user.username]);

  return (
    <FollowUserCard
      user={user}
      isFollowing={viewerState.isFollowing}
      followsYou={viewerState.followsYou}
      isSelf={viewerState.isSelf}
    />
  );
}
