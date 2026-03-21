'use client';

import { PostCard, type CommunityFeedPost } from '@/components/community/PostCard';

type Props = {
  posts: CommunityFeedPost[];
  currentUserId?: number | null;
  canInteract: boolean;
};

export function CommunityFeed({ posts, currentUserId, canInteract }: Props) {
  if (!posts.length) {
    return (
      <section className="card" style={{ padding: 24 }}>
        <span className="section-kicker">Feed</span>
        <h2 style={{ margin: '6px 0 12px' }}>No posts yet</h2>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Be the first to publish something in the community.</p>
      </section>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} canInteract={canInteract} />
      ))}
    </div>
  );
}
