'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { PostComposer } from '@/components/community/PostComposer';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { ActiveCreatorCard } from '@/components/community/ActiveCreatorCard';
import { piApiFetch } from '@/lib/pi-auth-client';
import type { CommunityFeedPost } from '@/components/community/PostCard';

type CreatorCardData = {
  id: number;
  username: string;
  fullName: string | null;
  headline: string | null;
  profileImage: string | null;
  score: number;
  stats: {
    posts: number;
    artworks: number;
    followers: number;
  };
};

type LinkedArtwork = {
  id: number;
  title: string;
  status: string;
};

export function CommunityClientShell({
  feedMode,
  creators,
}: {
  feedMode: 'top' | 'latest';
  creators: CreatorCardData[];
}) {
  const { user, status } = usePiAuth();
  const [posts, setPosts] = useState<CommunityFeedPost[]>([]);
  const [myArtworks, setMyArtworks] = useState<LinkedArtwork[]>([]);
  const [followingIds, setFollowingIds] = useState<number[]>([]);
  const [followerIds, setFollowerIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage(null);

      try {
        const postsResponse = await piApiFetch(`/api/community/posts?mode=${feedMode}`, {
          method: 'GET',
          cache: 'no-store',
        }).catch(() => null);
        const postsPayload = postsResponse ? await postsResponse.json().catch(() => null) : null;

        if (!cancelled) {
          setPosts(Array.isArray(postsPayload?.posts) ? postsPayload.posts : []);
        }

        if (status === 'authenticated') {
          const bootstrapResponse = await piApiFetch('/api/community/bootstrap', {
            method: 'GET',
            cache: 'no-store',
          }).catch(() => null);
          const bootstrapPayload = bootstrapResponse ? await bootstrapResponse.json().catch(() => null) : null;

          if (!cancelled) {
            setMyArtworks(Array.isArray(bootstrapPayload?.myArtworks) ? bootstrapPayload.myArtworks : []);
            setFollowingIds(Array.isArray(bootstrapPayload?.followingIds) ? bootstrapPayload.followingIds : []);
            setFollowerIds(Array.isArray(bootstrapPayload?.followerIds) ? bootstrapPayload.followerIds : []);
          }
        } else if (!cancelled) {
          setMyArtworks([]);
          setFollowingIds([]);
          setFollowerIds([]);
        }
      } catch {
        if (!cancelled) {
          setMessage('Unable to load the community feed right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [feedMode, status, user?.id]);

  const currentUserId = user?.id ?? null;
  const canInteract = Boolean(user) && status === 'authenticated';

  const creatorCards = useMemo(() => creators.map((creator) => ({
    ...creator,
    isFollowing: followingIds.includes(creator.id),
    followsYou: followerIds.includes(creator.id),
    isSelf: currentUserId === creator.id,
  })), [creators, currentUserId, followerIds, followingIds]);

  return (
    <>
      <PostComposer
        disabled={!canInteract}
        username={user?.username || null}
        artworks={myArtworks}
      />

      <section style={{ display: 'grid', gap: 16 }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Creators</span>
            <h2>Active creators</h2>
          </div>
          <p>A compact shortlist of the strongest creators right now, so visitors reach the feed quickly.</p>
        </div>

        {creatorCards.length > 0 ? (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {creatorCards.map((creator) => (
              <ActiveCreatorCard
                key={creator.id}
                creator={creator}
                isFollowing={creator.isFollowing}
                followsYou={creator.followsYou}
                isSelf={creator.isSelf}
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
            <h2>{feedMode === 'latest' ? 'Latest posts' : 'Top posts right now'}</h2>
          </div>
        </div>
        {message ? <div className="card" style={{ padding: 16 }}><p style={{ margin: 0 }}>{message}</p></div> : null}
        {loading && posts.length === 0 ? (
          <div className="card" style={{ padding: 24 }}><p style={{ margin: 0 }}>Loading community feed…</p></div>
        ) : (
          <CommunityFeed posts={posts} currentUserId={currentUserId} canInteract={canInteract} />
        )}
      </section>
    </>
  );
}
