'use client';

import Link from 'next/link';
import { PiConnectButton } from '@/components/PiConnectButton';
import { FollowButton } from '@/components/community/FollowButton';

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
  viewerState: ViewerState;
};

export default function PublicProfileViewerControls({ username, targetUserId, counts, viewerState }: Props) {
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
      ) : viewerState.authenticated ? (
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
