import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function RejectedArtworksPage() {
  const artworks = await prisma.artwork.findMany({
    where: {
      status: 'REJECTED'
    },
    include: {
      artist: {
        include: {
          artistProfile: true
        }
      },
      category: true
    },
    orderBy: {
      reviewedAt: 'desc'
    }
  });

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '24px'
        }}
      >
        <div>
          <h1 style={{ marginBottom: '8px' }}>Rejected Artworks</h1>
          <p style={{ opacity: 0.8, margin: 0 }}>
            Review rejected submissions and reopen them if needed.
          </p>
        </div>

        <Link href="/admin/artworks" className="button secondary">
          Back to Pending Queue
        </Link>
      </div>

      {artworks.length === 0 ? (
        <p>No rejected artworks found.</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {artworks.map((artwork) => {
            const artistName =
              artwork.artist.artistProfile?.displayName ||
              artwork.artist.fullName ||
              artwork.artist.username;

            return (
              <div
                key={artwork.id}
                className="card"
                style={{
                  padding: '18px',
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr auto',
                  gap: '16px',
                  alignItems: 'start'
                }}
              >
                <img
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  style={{
                    width: '120px',
                    height: '90px',
                    objectFit: 'cover',
                    borderRadius: '12px'
                  }}
                />

                <div>
                  <h3 style={{ margin: '0 0 8px' }}>{artwork.title}</h3>
                  <p style={{ margin: '0 0 6px', opacity: 0.8 }}>Artist: {artistName}</p>
                  <p style={{ margin: '0 0 6px', opacity: 0.8 }}>
                    Category: {artwork.category?.name || 'General'}
                  </p>
                  <p style={{ margin: '0 0 6px', opacity: 0.8 }}>
                    Price: {Number(artwork.price).toFixed(2)} π
                  </p>

                  {artwork.reviewNote ? (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      <strong>Review note:</strong>
                      <p style={{ margin: '8px 0 0', opacity: 0.9 }}>{artwork.reviewNote}</p>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <Link href={`/artwork/${artwork.id}`} className="button secondary">
                    View Artwork
                  </Link>

                  <form action="/api/admin/artworks/reopen" method="POST">
                    <input type="hidden" name="artworkId" value={artwork.id} />
                    <button className="button primary" type="submit">
                      Reopen Review
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
