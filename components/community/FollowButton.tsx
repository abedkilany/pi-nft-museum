'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { piApiFetch } from '../../lib/pi-auth-client';

type Props = {
  targetUserId: number;
  isFollowing: boolean;
  followsYou: boolean;
  isSelf?: boolean;
};

export function FollowButton({ targetUserId, isFollowing: initialFollowing, followsYou, isSelf }: Props) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isSelf) return null;

  const label = isFollowing ? 'Following' : followsYou ? 'Follow back' : 'Follow';
  const className = isFollowing ? 'button secondary' : 'button primary';

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const action = isFollowing ? 'unfollow' : 'follow';
      const response = await piApiFetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || 'Unable to update follow status.');
        return;
      }
      setIsFollowing(action === 'follow');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <button type="button" className={className} onClick={handleClick} disabled={busy}>
        {busy ? 'Please wait…' : label}
      </button>
      {error ? <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span> : null}
    </div>
  );
}