import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/domains/system';
import { FollowUserListClient } from '@/components/community/FollowUserListClient';

export default async function FollowersPage({ params }: { params: { username: string } }) {
  const profileUser = await prisma.user.findUnique({ where: { username: params.username }, select: { id: true, username: true, fullName: true } });

  if (!profileUser) notFound();

  const followers = await prisma.follow.findMany({
    where: { followingId: profileUser.id },
    orderBy: { createdAt: 'desc' },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          fullName: true,
          headline: true,
          profileImage: true,
        },
      },
    },
  });

  const followerUsers = followers.map((item) => item.follower);

  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Community</span>
            <h1>{profileUser.fullName || profileUser.username}&apos;s followers</h1>
          </div>
          <div className="card-actions">
            <Link href={`/profile/${profileUser.username}`} className="button secondary">Back to profile</Link>
            <Link href={`/profile/${profileUser.username}/following`} className="button secondary">View following</Link>
          </div>
        </div>
        {followers.length === 0 ? (
          <p style={{ margin: 0 }}>No followers yet.</p>
        ) : (
          <FollowUserListClient users={followerUsers} />
        )}
      </section>
    </div>
  );
}
