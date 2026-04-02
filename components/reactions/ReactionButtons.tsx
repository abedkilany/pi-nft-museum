'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { piApiFetch } from '../../lib/pi-auth-client';

type ReactionType = 'LIKE' | 'DISLIKE' | null;

export function ReactionButtons({
  artworkId,
  canReact,
  likesCount,
  dislikesCount,
  myReaction,
  isPremium = false,
  premiumAllowDislike = false
}: {
  artworkId: number;
  canReact: boolean;
  likesCount: number;
  dislikesCount: number;
  myReaction: ReactionType;
  isPremium?: boolean;
  premiumAllowDislike?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resolvedCanReact, setResolvedCanReact] = useState(canReact);
  const [localReaction, setLocalReaction] = useState<ReactionType>(myReaction);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [localDislikesCount, setLocalDislikesCount] = useState(dislikesCount);
  const [syncingState, setSyncingState] = useState(false);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    setResolvedCanReact(canReact);
  }, [canReact]);

  useEffect(() => {
    setLocalReaction(myReaction);
  }, [myReaction]);

  useEffect(() => {
    setLocalLikesCount(likesCount);
  }, [likesCount]);

  useEffect(() => {
    setLocalDislikesCount(dislikesCount);
  }, [dislikesCount]);

  useEffect(() => {
    if (!resolvedCanReact || myReaction !== null || hasSyncedRef.current || syncingState) return;

    let cancelled = false;
    hasSyncedRef.current = true;
    setSyncingState(true);

    piApiFetch(`/api/reactions/viewer-state?artworkId=${artworkId}`, {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (cancelled || !response.ok || !data?.ok) return;
        setResolvedCanReact(Boolean(data.authenticated));
        setLocalReaction((data.currentReaction ?? null) as ReactionType);
        if (typeof data.likesCount === 'number') setLocalLikesCount(data.likesCount);
        if (typeof data.dislikesCount === 'number') setLocalDislikesCount(data.dislikesCount);
      })
      .catch(() => {
        hasSyncedRef.current = false;
      })
      .finally(() => {
        if (!cancelled) setSyncingState(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artworkId, myReaction, resolvedCanReact, syncingState]);

  async function ensureAuthenticated() {
    if (resolvedCanReact) return true;

    const response = await piApiFetch('/api/auth/me', {
      method: 'GET',
      cache: 'no-store',
    }).catch(() => null);
    const data = response ? await response.json().catch(() => null) : null;

    if (response?.ok && data?.authenticated) {
      setResolvedCanReact(true);
      return true;
    }

    return false;
  }

  async function sendReaction(type: 'LIKE' | 'DISLIKE') {
    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      setMessage('Please log in to react to artworks.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await piApiFetch('/api/reactions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId, type })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to submit reaction.');
        setLoading(false);
        return;
      }

      setLocalReaction((data.currentReaction ?? null) as ReactionType);
      if (typeof data.likesCount === 'number') {
        setLocalLikesCount(data.likesCount);
      }
      if (typeof data.dislikesCount === 'number') {
        setLocalDislikesCount(data.dislikesCount);
      }

      setMessage(data.currentReaction ? 'Reaction updated successfully.' : 'Reaction removed successfully.');
      router.refresh();
    } catch {
      setMessage('Something went wrong while updating the reaction.');
    } finally {
      setLoading(false);
    }
  }

  const showDislikeButton = !isPremium || premiumAllowDislike;
  const likeLabel = localReaction === 'LIKE' ? 'Unlike' : 'Like';
  const dislikeLabel = localReaction === 'DISLIKE' ? 'Remove dislike' : 'Dislike';

  return (
    <div
      style={{
        padding: '14px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <p style={{ margin: '0 0 12px', fontWeight: 700 }}>
        {isPremium ? 'Premium Reaction' : 'Public Reaction'}
      </p>

      <div style={{ display: 'grid', gap: '10px' }} aria-busy={loading || syncingState}>
        <button
          className="button secondary"
          type="button"
          disabled={loading}
          onClick={() => sendReaction('LIKE')}
          style={{
            borderColor: localReaction === 'LIKE' ? '#2ecc71' : undefined,
            color: localReaction === 'LIKE' ? '#2ecc71' : undefined,
            background: localReaction === 'LIKE' ? 'rgba(46, 204, 113, 0.12)' : undefined
          }}
        >
          👍 {likeLabel} ({localLikesCount})
        </button>

        {showDislikeButton ? (
          <button
            className="button secondary"
            type="button"
            disabled={loading}
            onClick={() => sendReaction('DISLIKE')}
            style={{
              borderColor: localReaction === 'DISLIKE' ? '#e74c3c' : undefined,
              color: localReaction === 'DISLIKE' ? '#ff8f87' : undefined,
              background: localReaction === 'DISLIKE' ? 'rgba(231, 76, 60, 0.12)' : undefined
            }}
          >
            👎 {dislikeLabel} ({localDislikesCount})
          </button>
        ) : (
          <div
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              opacity: 0.8
            }}
          >
            Dislike is disabled in Premium Gallery.
          </div>
        )}
      </div>

      {message ? (
        <p style={{ margin: '12px 0 0', fontSize: '14px', opacity: 0.9 }}>{message}</p>
      ) : null}
    </div>
  );
}
