'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PiConnectButton } from '@/components/PiConnectButton';
import { FollowButton } from '@/components/community/FollowButton';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { piApiFetch } from '@/lib/pi-auth-client';

type ViewerState = {
  authenticated: boolean;
  currentUserId: number | null;
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
};

type Props = {
  username: string;
  targetUserId: number;
  counts: { followers: number; following: number };
};

const defaultViewerState: ViewerState = {
  authenticated: false,
  currentUserId: null,
  isSelf: false,
  isFollowing: false,
  followsYou: false,
};

export default function PublicProfileViewerControls({ username, targetUserId, counts }: Props) {
  const { status } = usePiAuth();
  const [viewerState, setViewerState] = useState<ViewerState>(defaultViewerState);

  useEffect(() => {
    let cancelled = false;

    async function loadViewerState() {
      if (status !== 'authenticated') {
        setViewerState(defaultViewerState);
        return;
      }

      const response = await piApiFetch(`/api/profile/viewer-state?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);

      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;

      if (!response?.ok || !payload?.ok) {
        setViewerState({
          authenticated: true,
          currentUserId: null,
          isSelf: false,
          isFollowing: false,
          followsYou: false,
        });
        return;
      }

      setViewerState({
        authenticated: Boolean(payload.authenticated),
        currentUserId: payload.currentUserId ?? null,
        isSelf: Boolean(payload.isSelf),
        isFollowing: Boolean(payload.isFollowing),
        followsYou: Boolean(payload.followsYou),
      });
    }

    void loadViewerState();

    return () => {
      cancelled = true;
    };
  }, [status, username]);

  const links = (
    <>
      <Link href={`/profile/${username}/followers`} className="button secondary">Followers · {counts.followers}</Link>
      <Link href={`/profile/${username}/following`} className="button secondary">Following · {counts.following}</Link>
    </>
  );

  return (
    <div className="profile-cover-actions">
      {links}
      {viewerState.isSelf ? (
        <>
          <Link href="/account" className="button primary">Edit profile</Link>
          <Link href="/account/artworks" className="button secondary">My artworks</Link>
        </>
      ) : status === 'authenticated' ? (
        <FollowButton
          targetUserId={targetUserId}
          isFollowing={viewerState.isFollowing}
          followsYou={viewerState.followsYou}
          isSelf={viewerState.isSelf}
        />
      ) : (
        <PiConnectButton className="button primary">Login with Pi to follow</PiConnectButton>
      )}
    </div>
  );
}
