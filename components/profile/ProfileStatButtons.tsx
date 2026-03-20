'use client';

import { useState } from 'react';
import ProfileConnectionsModal from '@/components/profile/ProfileConnectionsModal';

export default function ProfileStatButtons({
  username,
  followers,
  following,
  artworks,
  artworksHref,
  artworksLabel,
}: {
  username: string;
  followers: number;
  following: number;
  artworks: number;
  artworksHref?: string;
  artworksLabel?: string;
}) {
  const [open, setOpen] = useState<null | 'followers' | 'following'>(null);

  return (
    <>
      <div className="stats-grid">
        <button type="button" className="card stat-card stat-button" onClick={() => setOpen('followers')}>
          <strong>{followers}</strong>
          <span>Followers</span>
        </button>
        <button type="button" className="card stat-card stat-button" onClick={() => setOpen('following')}>
          <strong>{following}</strong>
          <span>Following</span>
        </button>
        {artworksHref ? (
          <a href={artworksHref} className="card stat-card stat-button" style={{ textDecoration: 'none', color: 'inherit' }}>
            <strong>{artworks}</strong>
            <span>{artworksLabel || 'Artworks'}</span>
          </a>
        ) : (
          <div className="card stat-card">
            <strong>{artworks}</strong>
            <span>{artworksLabel || 'Artworks'}</span>
          </div>
        )}
      </div>
      <ProfileConnectionsModal username={username} type={open || 'followers'} open={Boolean(open)} onClose={() => setOpen(null)} />
    </>
  );
}
