'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { piApiFetch } from '../../lib/pi-auth-client';

export function RatingStars({
  artworkId,
  canRate,
  currentAverage,
  currentVotes
}: {
  artworkId: number;
  canRate: boolean;
  currentAverage: number;
  currentVotes: number;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resolvedCanRate, setResolvedCanRate] = useState(canRate);

  useEffect(() => {
    setResolvedCanRate(canRate);
  }, [canRate]);

  async function ensureAuthenticated() {
    if (resolvedCanRate) return true;

    const confirmSession = async () => {
      const response = await piApiFetch('/api/auth/me', {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);
      const data = response ? await response.json().catch(() => null) : null;

      if (response?.ok && data?.authenticated) {
        setResolvedCanRate(true);
        return true;
      }

      return false;
    };

    if (await confirmSession()) return true;

    const returnTo = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/review';

    await fetch(`/api/auth/bootstrap?returnTo=${encodeURIComponent(returnTo)}`, {
      method: 'GET',
      credentials: 'include',
      redirect: 'follow',
      cache: 'no-store',
    }).catch(() => null);

    return confirmSession();
  }

  async function submitRating(value: number) {
    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      setMessage('Please log in to rate artworks.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await piApiFetch('/api/ratings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId, value })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to submit rating.');
        setLoading(false);
        return;
      }

      setMessage('Rating submitted successfully.');
      router.refresh();
    } catch {
      setMessage('Something went wrong while submitting the rating.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: '14px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <p style={{ margin: '0 0 10px', fontWeight: 700 }}>Rate this artwork</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => submitRating(star)}
            disabled={loading}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '28px',
              color: (hovered ?? 0) >= star ? '#f0c45c' : '#8b8b8b',
              padding: 0,
              lineHeight: 1
            }}
            aria-label={`Rate ${star} stars`}
          >
            ★
          </button>
        ))}
      </div>

      <p style={{ margin: '0 0 8px', opacity: 0.8 }}>
        Average: {currentAverage.toFixed(1)} / 5
      </p>
      <p style={{ margin: '0 0 8px', opacity: 0.8 }}>
        Votes: {currentVotes}
      </p>

      {message ? (
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>{message}</p>
      ) : null}
    </div>
  );
}