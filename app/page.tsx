import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/domains/system';
import { getSiteSettingsMap, getArraySetting, getNumberSetting, getStringSetting } from '@/lib/site-settings';
import { getArtworkStatusLabel } from '@/lib/domains/artworks';
import { getDisplayImageUrl } from '@/lib/image-url';

const getHomePageData = unstable_cache(
  async (featuredStatuses: string[], featuredLimit: number) => {
    return Promise.all([
      prisma.artwork.findMany({
        where: { status: { in: featuredStatuses as any[] } },
        take: featuredLimit,
        select: {
          id: true,
          title: true,
          imageUrl: true,
          status: true,
          description: true,
          artist: {
            select: {
              username: true,
              fullName: true,
              artistProfile: { select: { displayName: true } }
            }
          },
          category: { select: { id: true, name: true } }
        },
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }]
      }),
      prisma.artwork.groupBy({ by: ['status'], _count: true })
    ]);
  },
  ['home-page-data'],
  { revalidate: 30 }
);

export default async function HomePage() {
  const settings = await getSiteSettingsMap();
  const featuredStatuses = getArraySetting(settings, 'home_featured_statuses', ['PUBLISHED', 'PREMIUM']);
  const featuredLimit = getNumberSetting(settings, 'home_featured_limit', 6);
  const siteName = getStringSetting(settings, 'site_name', 'Pi NFT Museum');
  const siteTagline = getStringSetting(settings, 'site_tagline', 'A digital museum for NFT artworks on Pi Network');
  const placeholder = getStringSetting(settings, 'placeholder_artwork_image_url', '/placeholder-artwork.svg');

  const [artworks, stats] = await getHomePageData(featuredStatuses, featuredLimit);

  const pending = stats.find((item: any) => item.status === 'PENDING')?._count || 0;
  const published = stats.find((item: any) => item.status === 'PUBLISHED')?._count || 0;
  const premium = stats.find((item: any) => item.status === 'PREMIUM')?._count || 0;

  return (
    <div className="home-page">
      <section className="card home-hero-card">
        <span className="section-kicker">Pi Network ready foundation</span>
        <h1>{siteName}</h1>
        <p>{siteTagline}</p>
        <div className="hero-actions home-hero-actions">
          <Link href="/gallery" className="button primary">Open gallery</Link>
          <Link href="/review" className="button secondary">Public review</Link>
          <Link href="/community" className="button secondary">Community groundwork</Link>
        </div>
      </section>

      <section className="stats-grid home-stats-grid">
        <div className="card stat-card"><strong>{published}</strong><span>Published</span></div>
        <div className="card stat-card"><strong>{premium}</strong><span>Premium</span></div>
        <div className="card stat-card"><strong>{pending}</strong><span>Awaiting review</span></div>
      </section>

      <section className="card home-featured-card">
        <div className="section-head compact home-section-head">
          <div>
            <span className="section-kicker">Featured</span>
            <h2>Minted artworks only</h2>
          </div>
          <p>Homepage now uses site settings and only shows minted gallery-ready artwork statuses.</p>
        </div>

        {artworks.length === 0 ? (
          <p className="home-empty-state">No featured artworks are available yet.</p>
        ) : (
          <div className="gallery-grid home-gallery-grid">
            {artworks.map((artwork: any) => {
              const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
              const description = artwork.description.length > 90 ? `${artwork.description.slice(0, 90)}…` : artwork.description;

              return (
                <article key={artwork.id} className="card art-card">
                  <div className="art-image-wrap">
                    <img src={getDisplayImageUrl(artwork.imageUrl) || placeholder} alt={artwork.title} className="art-image" />
                  </div>
                  <div className="art-body">
                    <div className="art-top home-art-top">
                      <div>
                        <h3>{artwork.title}</h3>
                        <p>{artistName}</p>
                      </div>
                      <span className="pill">{getArtworkStatusLabel(artwork.status)}</span>
                    </div>
                    <p className="art-description home-art-description">{description}</p>
                    <div className="card-actions home-card-actions">
                      <Link href={`/artwork/${artwork.id}`} className="button secondary">View</Link>
                      {artwork.status === 'PREMIUM' ? (
                        <Link href="/premium" className="button primary">Premium</Link>
                      ) : (
                        <Link href="/gallery" className="button primary">Gallery</Link>
                      )}
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
