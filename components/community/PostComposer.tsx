'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { piApiFetch } from '@/lib/pi-auth-client';

type Props = {
  disabled?: boolean;
  username?: string | null;
  artworks?: Array<{
    id: number;
    title: string;
    status: string;
  }>;
};

export function PostComposer({ disabled = false, username, artworks = [] }: Props) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [resolvedDisabled, setResolvedDisabled] = useState(disabled);
  const [artworkId, setArtworkId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveAuth() {
      if (!disabled) {
        setResolvedDisabled(false);
        return;
      }

      const response = await piApiFetch('/api/auth/me', {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);
      const data = response ? await response.json().catch(() => null) : null;

      if (!cancelled) {
        setResolvedDisabled(!(response?.ok && data?.authenticated));
      }
    }

    void resolveAuth();
    return () => {
      cancelled = true;
    };
  }, [disabled]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resolvedDisabled || busy || body.trim().length < 3) return;

    setBusy(true);
    setMessage(null);
    try {
      const response = await piApiFetch('/api/community/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, artworkId: artworkId || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error || 'Unable to publish post.');
        return;
      }
      setBody('');
      setArtworkId('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ padding: 20, display: 'grid', gap: 14 }}>
      <div>
        <span className="section-kicker">Post composer</span>
        <h2 style={{ margin: '6px 0 0' }}>Share something with the community</h2>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          maxLength={1500}
          placeholder={resolvedDisabled ? 'Log in to publish a post.' : `What would you like to share${username ? `, @${username}` : ''}?`}
          disabled={resolvedDisabled || busy}
        />

        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="community-artwork" style={{ fontSize: 14, fontWeight: 600 }}>
            Attach one of your artworks <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <select
            id="community-artwork"
            value={artworkId}
            onChange={(event) => setArtworkId(event.target.value)}
            disabled={resolvedDisabled || busy || artworks.length === 0}
          >
            <option value="">No linked artwork</option>
            {artworks.map((artwork) => (
              <option key={artwork.id} value={String(artwork.id)}>
                {artwork.title} · {artwork.status}
              </option>
            ))}
          </select>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            Linking an artwork gives your post a richer preview and gives the feed a stronger museum feel.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{body.trim().length}/1500</span>
          <div className="card-actions" style={{ gap: 8, marginTop: 0 }}>
            {message ? <span style={{ color: '#f87171', fontSize: 13 }}>{message}</span> : null}
            <button className="button primary" type="submit" disabled={resolvedDisabled || busy || body.trim().length < 3}>
              {busy ? 'Publishing...' : 'Publish post'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
