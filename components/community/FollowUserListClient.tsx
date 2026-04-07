'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { FollowUserCard } from '@/components/community/FollowUserCard';
import { piApiFetch } from '@/lib/pi-auth-client';

type UserCardData = {
  id: number;
  username: string;
  fullName: string | null;
  headline: string | null;
  profileImage: string | null;
};

type FollowListStateItem = {
  targetUserId: number;
  isFollowing: boolean;
  followsYou: boolean;
  isSelf: boolean;
};

type Props = {
  users: UserCardData[];
};

export function FollowUserListClient({ users }: Props) {
  const { status } = usePiAuth();
  const [stateMap, setStateMap] = useState<Record<number, FollowListStateItem>>({});

  const userIds = useMemo(() => users.map((user) => user.id).filter((id) => Number.isFinite(id) && id > 0), [users]);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      if (status !== 'authenticated' || userIds.length === 0) {
        setStateMap({});
        return;
      }

      const query = new URLSearchParams({ ids: userIds.join(',') });
      const response = await piApiFetch(`/api/profile/follow-list-state?${query.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);

      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;

      if (!response?.ok || !payload?.ok || !Array.isArray(payload.items)) {
        setStateMap({});
        return;
      }

      const nextStateMap: Record<number, FollowListStateItem> = {};
      for (const item of payload.items as FollowListStateItem[]) {
        if (!item || !Number.isFinite(item.targetUserId)) continue;
        nextStateMap[item.targetUserId] = item;
      }
      setStateMap(nextStateMap);
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [status, userIds]);

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {users.map((user) => {
        const state = stateMap[user.id];
        return (
          <FollowUserCard
            key={user.id}
            user={user}
            isFollowing={Boolean(state?.isFollowing)}
            followsYou={Boolean(state?.followsYou)}
            isSelf={Boolean(state?.isSelf)}
          />
        );
      })}
    </div>
  );
}
