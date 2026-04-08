'use client';

import { useEffect, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { piApiFetch } from '@/lib/pi-auth-client';
import { FollowUserCard } from '@/components/community/FollowUserCard';

export function FollowUserCardClient({
  user,
}: {
  user: {
    id: number;
    username: string;
    fullName: string | null;
    headline: string | null;
    profileImage: string | null;
  };
}) {
  const { status } = usePiAuth();
  const [viewerState, setViewerState] = useState({ isFollowing: false, followsYou: false, isSelf: false });

  useEffect(() => {
    if (status !== 'authenticated') {
      setViewerState({ isFollowing: false, followsYou: false, isSelf: false });
      return;
    }

    let cancelled = false;
    async function load() {
      const response = await piApiFetch(`/api/follows/viewer-state?userIds=${user.id}`, { method: 'GET', cache: 'no-store' }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;
      if (!response?.ok || !payload?.ok) return;
      const state = payload?.states?.[String(user.id)];
      setViewerState({
        isFollowing: Boolean(state?.isFollowing),
        followsYou: Boolean(state?.followsYou),
        isSelf: Boolean(state?.isSelf),
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status, user.id]);

  return <FollowUserCard user={user} {...viewerState} />;
}
