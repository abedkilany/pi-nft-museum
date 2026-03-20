'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';

export type ConnectionItem = {
  id: number;
  username: string;
  fullName: string | null;
  headline: string | null;
  profileImage: string | null;
  isFollowing: boolean;
  followsYou: boolean;
  isSelf: boolean;
};

export default function ProfileConnectionsModal({
  username,
  type,
  open,
  onClose,
}: {
  username: string;
  type: 'followers' | 'following';
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await piApiFetch(`/api/profile/${encodeURIComponent(username)}/connections?type=${type}`, {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || 'Failed to load connections.');
        }
        setItems(payload.items || []);
        setTitle(payload.title || (type === 'followers' ? 'Followers' : 'Following'));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load connections.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, type, username]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="profile-modal-backdrop" onClick={onClose} role="presentation">
      <div className="card profile-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-head">
          <div>
            <span className="section-kicker">Community</span>
            <h3>{title}</h3>
          </div>
          <button type="button" className="button secondary" onClick={onClose}>Close</button>
        </div>
        {loading ? <p style={{ margin: 0 }}>Loading…</p> : null}
        {error ? <p style={{ margin: 0, color: '#ffb3b3' }}>{error}</p> : null}
        {!loading && !error && items.length === 0 ? <p style={{ margin: 0 }}>No users to show.</p> : null}
        {!loading && !error ? (
          <div className="profile-connection-list">
            {items.map((item) => {
              const displayName = item.fullName || item.username;
              return (
                <Link key={item.id} href={`/profile/${item.username}`} className="profile-connection-item" onClick={onClose}>
                  <div className="profile-connection-avatar">
                    {item.profileImage ? (
                      <img src={item.profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{displayName.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <strong>{displayName}</strong>
                    <p>@{item.username}</p>
                    <div className="profile-connection-flags">
                      {item.isSelf ? <span className="pill">You</span> : null}
                      {!item.isSelf && item.isFollowing ? <span className="pill">Following</span> : null}
                      {!item.isSelf && item.followsYou ? <span className="pill">Follows you</span> : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
