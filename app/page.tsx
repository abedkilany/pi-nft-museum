import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSiteSettingsMap, getArraySetting, getNumberSetting, getStringSetting } from '@/lib/site-settings';
import { getArtworkStatusLabel } from '@/lib/artwork-status';
import { formatTimeAgo } from '@/lib/community';

export default async function HomePage() {
  const settings = await getSiteSettingsMap();
  const featuredStatuses = getArraySetting(settings, 'home_featured_statuses', ['PUBLISHED', 'PREMIUM']);
  const featuredLimit = getNumberSetting(settings, 'home_featured_limit', 6);
  const siteName = getStringSetting(settings, 'site_name', 'Pi NFT Museum');
  const siteTagline = getStringSetting(settings, 'site_tagline', 'A digital museum for NFT artworks on Pi Network');
  const placeholder = getStringSetting(settings, 'placeholder_artwork_image_url', '/placeholder-artwork.svg');

  const [artworks, stats, activities] = await Promise.all([
    prisma.artwork.findMany({
      where: { status: { in: featuredStatuses as any[] } },
      take: featuredLimit,
      include: { artist: { include: { artistProfile: true } }, category: true },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }]
    }),
    prisma.artwork.groupBy({ by: ['status'], _count: true }),
    prisma.communityActivity.findMany({ include: { actor: { select: { username: true, fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 6 })
  ]);

  const pending = stats.find((item) => item.status === 'PENDING')?._count || 0;
  const published = stats.find((item) => item.status === 'PUBLISHED')?._count || 0;
  const premium = stats.find((item) => item.status === 'PREMIUM')?._count || 0;

  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '32px' }}>
        <span className="section-kicker">Pi Network ready foundation</span>
        <h1 style={{ margin: '0 0 12px' }}>{siteName}</h1>
        <p style={{ margin: 0, maxWidth: '760px', lineHeight: 1.8, color: 'var(--muted)' }}>{siteTagline}</p>
        <div className="hero-actions">
          <Link href="/gallery" className="button primary">Open gallery</Link>
          <Link href="/review" className="button secondary">Public review</Link>
          <Link href="/community" className="button secondary">Community groundwork</Link>
        </div>
      </section>

      <section className="stats-grid">
        <div className="card stat-card"><strong>{published}</strong><span>Published</span></div>
        <div className="card stat-card"><strong>{premium}</strong><span>Premium</span></div>
        <div className="card stat-card"><strong>{pending}</strong><span>Awaiting review</span></div>
      </section>

      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Featured</span>
            <h2>Minted artworks only</h2>
          </div>
          <p>Homepage now uses site settings and only shows minted gallery-ready artwork statuses.</p>
        </div>

        {artworks.length === 0 ? (
          <p style={{ margin: 0 }}>No featured artworks are available yet.</p>
        ) : (
          <div className="gallery-grid">
            {artworks.map((artwork) => {
              const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
              return (
                <article key={artwork.id} className="card art-card">
                  <div className="art-image-wrap">
                    <img src={artwork.imageUrl || placeholder} alt={artwork.title} className="art-image" />
                  </div>
                  <div style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'start' }}>
                      <div>
                        <h3 style={{ margin: '0 0 6px' }}>{artwork.title}</h3>
                        <p style={{ margin: 0, color: 'var(--muted)' }}>{artistName}</p>
                      </div>
                      <span className="pill">{getArtworkStatusLabel(artwork.status)}</span>
                    </div>
                    <p style={{ color: 'var(--muted)', minHeight: '48px' }}>{artwork.description.slice(0, 90)}{artwork.description.length > 90 ? '…' : ''}</p>
                    <div className="card-actions">
                      <Link href={`/artwork/${artwork.id}`} className="button secondary">View</Link>
                      {artwork.status === 'PREMIUM' ? <Link href="/premium" className="button primary">Premium</Link> : <Link href="/gallery" className="button primary">Gallery</Link>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
