'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import type { CommunityFeedPost } from '@/components/community/PostCard';
import { formatTimeAgo } from '@/lib/community';

type ActivityItem = {
  id: string;
  kind: 'activity' | 'comment' | 'reply';
  title: string;
  message: string;
  createdAt: string;
  linkUrl?: string | null;
};

const TAB_LABELS = {
  posts: 'Recent posts',
  liked: 'Recent liked posts',
  activity: 'Recent activity',
} as const;

type TabKey = keyof typeof TAB_LABELS;

export default function PublicProfileCommunityTabs({
  posts,
  likedPosts,
  activity,
  currentUserId,
  canInteract,
}: {
  posts: CommunityFeedPost[];
  likedPosts: CommunityFeedPost[];
  activity: ActivityItem[];
  currentUserId: number | null;
  canInteract: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('posts');

  const counts = useMemo(
    () => ({ posts: posts.length, liked: likedPosts.length, activity: activity.length }),
    [posts.length, likedPosts.length, activity.length],
  );

  return (
    <section className="card surface-section">
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Community</span>
          <h2>Recent public presence</h2>
        </div>
        <p>This section shows a recent preview of posts, liked posts, and activity.</p>
      </div>

      <div className="card-actions" style={{ gap: 8, marginTop: 0, flexWrap: 'wrap' }}>
        {(['posts', 'liked', 'activity'] as TabKey[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              className={active ? 'button primary' : 'button secondary'}
              onClick={() => setActiveTab(tab)}
              aria-pressed={active}
            >
              {TAB_LABELS[tab]} · {counts[tab]}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        {activeTab === 'posts' ? (
          posts.length > 0 ? (
            <CommunityFeed posts={posts} currentUserId={currentUserId} canInteract={canInteract} />
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)' }}>No public community posts yet.</p>
          )
        ) : null}

        {activeTab === 'liked' ? (
          likedPosts.length > 0 ? (
            <CommunityFeed posts={likedPosts} currentUserId={currentUserId} canInteract={canInteract} />
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)' }}>No public liked posts to show yet.</p>
          )
        ) : null}

        {activeTab === 'activity' ? (
          activity.length > 0 ? (
            <div className="stack-sm">
              {activity.map((item) => (
                <article key={item.id} className="card" style={{ padding: 16 }}>
                  <div className="feed-item-header">
                    <div>
                      <strong>{item.title}</strong>
                      <p style={{ margin: '8px 0 0', color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{item.message}</p>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: 14, whiteSpace: 'nowrap' }}>{formatTimeAgo(item.createdAt)}</span>
                  </div>
                  {item.linkUrl ? (
                    <div className="card-actions" style={{ marginTop: 12 }}>
                      <Link href={item.linkUrl} className="button secondary">
                        Open
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)' }}>No public activity yet.</p>
          )
        ) : null}
      </div>
    </section>
  );
}
