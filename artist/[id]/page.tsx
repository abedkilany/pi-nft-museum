import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function ArtistPage({ params }: { params: { id: string } }) {
  const artistId = Number(params.id);
  const user = await prisma.user.findUnique({
    where: { id: artistId },
    include: {
      artistProfile: true,
      artworks: {
        where: { status: { in: ['PUBLISHED', 'PREMIUM'] } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  if (!user) notFound();

  const artistName = user.artistProfile?.displayName || user.fullName || user.username;
  return (
    <div style={{ paddingTop: '30px' }}>
      <div className="card" style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px' }}>
        <h1>{artistName}</h1>
        <p style={{ opacity: 0.8, marginTop: '10px' }}>{user.artistProfile?.headline || 'Artist profile'}</p>
        <p style={{ marginTop: '20px', lineHeight: 1.8 }}>{user.artistProfile?.biography || user.bio || 'No biography available yet.'}</p>
        <h2 style={{ marginTop: '40px' }}>Published artworks</h2>
        <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
          {user.artworks.map((artwork: any) => (
            <div key={artwork.id} className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{artwork.title}</h3>
                <p style={{ margin: '8px 0 0', opacity: 0.8 }}>{Number(artwork.price).toFixed(2)} {artwork.currency}</p>
              </div>
              <Link href={`/artwork/${artwork.id}`} className="button secondary">View artwork</Link>
            </div>
          ))}
          {user.artworks.length === 0 ? <p>No published artworks found for this artist.</p> : null}
        </div>
      </div>
    </div>
  );
}
