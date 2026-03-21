import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSiteSettingsMap, getBooleanSetting } from '@/lib/site-settings';
import { formatTimeAgo } from '@/lib/community';

export default async function CommunityPage() {
  const settings = await getSiteSettingsMap();
  const enabled = getBooleanSetting(settings, 'community_enabled', false);

  if (!enabled) {
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

  const activities = await prisma.communityActivity.findMany({
    include: { actor: { select: { username: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '28px' }}>
        <span className="section-kicker">Community</span>
        <h1 style={{ margin: '0 0 12px' }}>Activity</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
          Community tools are enabled. This feed highlights follows, comments, replies, and artwork reactions.
        </p>
        <div className="card-actions">
          <span className="pill">Follow system active</span>
          <span className="pill">Notifications active</span>
        </div>
      </section>

      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Live feed</span>
            <h2>Recent community activity</h2>
          </div>
          <p>Posts and blog content can be added later on top of this social layer.</p>
        </div>

        {activities.length === 0 ? (
          <p style={{ margin: 0 }}>No activity yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {activities.map((activity: any) => (
              <article key={activity.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'start' }}>
                  <div>
                    <strong>{activity.title}</strong>
                    <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{activity.message}</p>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </div>
                {activity.linkUrl ? (
                  <div className="card-actions" style={{ marginTop: 12 }}>
                    <Link href={activity.linkUrl} className="button secondary">Open</Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
