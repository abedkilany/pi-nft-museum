'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { PostComposer } from '@/components/community/PostComposer';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { ActiveCreatorCard } from '@/components/community/ActiveCreatorCard';
import { piApiFetch } from '@/lib/pi-auth-client';

type CommunityBootstrap = {
  ok: boolean;
  enabled: boolean;
  feedMode?: 'top' | 'latest';
  currentUser?: {
    userId: number;
    username: string;
  } | null;
  myArtworks?: Array<{ id: number; title: string; status: string }>;
  posts?: any[];
  creators?: Array<{
    id: number;
    username: string;
    fullName: string | null;
    headline: string | null;
    profileImage: string | null;
    score: number;
    stats: { posts: number; artworks: number; followers: number };
    isFollowing: boolean;
    followsYou: boolean;
  }>;
};

export function CommunityPageClient() {
  const searchParams = useSearchParams();
  const feed = searchParams.get('feed') === 'latest' ? 'latest' : 'top';
  const { status } = usePiAuth();
  const [data, setData] = useState<CommunityBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      const url = `/api/community/bootstrap?feed=${feed}`;
      const response = status === 'authenticated'
        ? await piApiFetch(url, { method: 'GET' }).catch(() => null)
        : await fetch(url, { method: 'GET', cache: 'no-store' }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;

      if (cancelled) return;

      if (!response?.ok || !payload?.ok) {
        setError(payload?.error || 'Failed to load the community feed.');
        setData(null);
        setLoading(false);
        return;
      }

      setData(payload as CommunityBootstrap);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [feed, status]);

  const canInteract = status === 'authenticated' && Boolean(data?.currentUser?.userId);
  const currentUserId = data?.currentUser?.userId ?? null;

  const disabledReason = useMemo(() => {
    if (status === 'loading') return 'Checking your Pi session...';
    if (!canInteract) return 'Connect with Pi to publish, like, and comment.';
    return null;
  }, [canInteract, status]);

  if (loading) {
    return <div className="page-stack"><section className="card surface-section"><p>Loading community…</p></section></div>;
  }

  if (error) {
    return <div className="page-stack"><section className="card surface-section"><p>{error}</p></section></div>;
  }

  if (!data?.enabled) {
    return (
      <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
        <section className="card" style={{ padding: '28px' }}>
          <span className="section-kicker">Community</span>
          <h1 style={{ margin: '0 0 12px' }}>Coming soon</h1>
          <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
            The community area is currently disabled from site settings. The social layer will appear here once it is enabled.
          </p>
          <div className="card-actions">
            <Link href="/gallery" className="button secondary">Back to gallery</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '28px' }}>
        <span className="section-kicker">Community 2.0</span>
        <h1 style={{ margin: '0 0 12px' }}>Creator feed</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
          The community now prioritizes stronger posts, surfaces active creators more intelligently, and lets artists attach an artwork directly to a post.
        </p>
        <div className="card-actions">
          <span className="pill">Smart feed</span>
          <span className="pill">Artwork sharing</span>
          <span className="pill">Creator ranking</span>
          <span className="pill">Replies live</span>
        </div>
      </section>

      <div style={{ display: 'grid', gap: 8 }}>
        <PostComposer
          disabled={!canInteract}
          username={data.currentUser?.username || null}
          artworks={data.myArtworks || []}
        />
        {disabledReason ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>{disabledReason}</span> : null}
      </div>

      <section style={{ display: 'grid', gap: 16 }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Creators</span>
            <h2>Active creators</h2>
          </div>
          <p>A compact shortlist of the strongest creators right now, so visitors reach the feed quickly.</p>
        </div>

        {(data.creators || []).length > 0 ? (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {(data.creators || []).map((creator) => (
              <ActiveCreatorCard
                key={creator.id}
                creator={creator}
                isFollowing={creator.isFollowing}
                followsYou={creator.followsYou}
                isSelf={currentUserId === creator.id}
              />
            ))}
          </div>
        ) : (
          <section className="card" style={{ padding: 24 }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>No active creators are available yet. As soon as creators publish posts or artworks, they will appear here.</p>
          </section>
        )}
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Feed</span>
            <h2>{feed === 'latest' ? 'Latest posts' : 'Top posts right now'}</h2>
          </div>
          <div className="card-actions" style={{ marginTop: 0 }}>
            <Link href="/community?feed=top" className={feed === 'top' ? 'button primary' : 'button secondary'}>Top</Link>
            <Link href="/community?feed=latest" className={feed === 'latest' ? 'button primary' : 'button secondary'}>Latest</Link>
          </div>
        </div>
        <CommunityFeed posts={data.posts || []} currentUserId={currentUserId} canInteract={canInteract} />
      </section>
    </div>
  );
}
