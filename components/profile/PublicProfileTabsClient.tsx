'use client';

import { usePiAuth } from '@/components/auth/PiAuthProvider';
import PublicProfileCommunityTabs from '@/components/profile/PublicProfileCommunityTabs';
import type { CommunityFeedPost } from '@/components/community/PostCard';

type ActivityItem = {
  id: string;
  kind: 'activity' | 'comment' | 'reply';
  title: string;
  message: string;
  createdAt: string;
  linkUrl?: string | null;
};

export default function PublicProfileTabsClient({
  posts,
  likedPosts,
  activity,
}: {
  posts: CommunityFeedPost[];
  likedPosts: CommunityFeedPost[];
  activity: ActivityItem[];
}) {
  const { status, user } = usePiAuth();

  return (
    <PublicProfileCommunityTabs
      posts={posts}
      likedPosts={likedPosts}
      activity={activity}
      currentUserId={status === 'authenticated' ? user?.id || null : null}
      canInteract={status === 'authenticated'}
    />
  );
}
