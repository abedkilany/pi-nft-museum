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
    const previous = isFollowing;
    setBusy(true);
    setError(null);
    setIsFollowing(!previous);

    try {
      const response = await piApiFetch('/api/follows/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setIsFollowing(previous);
        setError(response.status === 401 ? 'Please log in with Pi to follow creators.' : data?.error || 'Unable to update follow status.');
        return;
      }
      setIsFollowing(Boolean(data?.following));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <button type="button" className={className} onClick={handleClick} disabled={busy} aria-pressed={isFollowing}>
        {busy ? 'Please wait…' : label}
      </button>
      {error ? <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span> : null}
    </div>
  );
}
