import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { FollowUserCard } from '@/components/community/FollowUserCard';

export default async function FollowingPage({ params }: { params: { username: string } }) {
  const [profileUser, currentUser] = await Promise.all([
    prisma.user.findUnique({ where: { username: params.username }, select: { id: true, username: true, fullName: true } }),
    getCurrentUser(),
  ]);

  if (!profileUser) notFound();

  const following = await prisma.follow.findMany({
    where: { followerId: profileUser.id },
    orderBy: { createdAt: 'desc' },
    include: {
      following: {
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

  const targetIds = following.map((item: any) => item.following.id);
  let followingSet = new Set<number>();
  let reverseSet = new Set<number>();

  if (currentUser) {
    const [mine, reverse] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: currentUser.userId, followingId: { in: targetIds } },
        select: { followingId: true },
      }),
      prisma.follow.findMany({
        where: { followerId: { in: targetIds }, followingId: currentUser.userId },
        select: { followerId: true },
      }),
    ]);
    followingSet = new Set(mine.map((item: any) => item.followingId));
    reverseSet = new Set(reverse.map((item: any) => item.followerId));
  }

  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Community</span>
            <h1>{profileUser.fullName || profileUser.username} follows</h1>
          </div>
          <div className="card-actions">
            <Link href={`/profile/${profileUser.username}`} className="button secondary">Back to profile</Link>
            <Link href={`/profile/${profileUser.username}/followers`} className="button secondary">View followers</Link>
          </div>
        </div>
        {following.length === 0 ? (
          <p style={{ margin: 0 }}>This account is not following anyone yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {following.map((entry: any) => (
              <FollowUserCard
                key={entry.id}
                user={entry.following}
                isFollowing={followingSet.has(entry.following.id)}
                followsYou={reverseSet.has(entry.following.id)}
                isSelf={currentUser?.userId === entry.following.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
