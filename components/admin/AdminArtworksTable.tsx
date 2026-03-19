'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { piApiFetch } from '../../lib/pi-auth-client';

type AdminArtwork = {
  id: number;
  title: string;
  imageUrl: string;
  price: number;
  status: string;
  createdAt: string;
  artistName: string;
};

export function AdminArtworksTable({
  artworks
}: {
  artworks: AdminArtwork[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  async function updateStatus(artworkId: number, status: string) {
    try {
      setLoadingId(artworkId);
      setMessage('');

      const reviewNote = reviewNotes[artworkId] || '';

      const response = await piApiFetch('/api/admin/artworks/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ artworkId, status, reviewNote })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to update artwork status.');
        setLoadingId(null);
        return;
      }

      setMessage(
        status === 'APPROVED'
          ? `Artwork #${artworkId} moved to PUBLIC_REVIEW.`
          : `Artwork #${artworkId} updated to ${status}.`
      );
      router.refresh();
    } catch {
      setMessage('Something went wrong while updating the artwork.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ marginBottom: '8px' }}>Pending Artworks Review</h1>
        <p style={{ opacity: 0.8 }}>
          Review submitted artworks and either move them to public review or reject them.
        </p>
      </div>

      {message ? (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)'
          }}
        >
          {message}
        </div>
      ) : null}

      {artworks.length === 0 ? (
        <p>No pending artworks found.</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {artworks.map((artwork) => (
            <div
              key={artwork.id}
              className="card"
              style={{
                padding: '18px',
                display: 'grid',
                gap: '16px'
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr',
                  gap: '16px',
                  alignItems: 'center'
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
                  <p style={{ margin: '0 0 6px', opacity: 0.8 }}>
                    Artist: {artwork.artistName}
                  </p>
                  <p style={{ margin: '0 0 6px', opacity: 0.8 }}>
                    Price: {artwork.price.toFixed(2)} π
                  </p>
                  <p style={{ margin: 0, opacity: 0.65, fontSize: '14px' }}>
                    Submitted: {new Date(artwork.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Review note</span>
                  <textarea
                    rows={4}
                    placeholder="Write review note or rejection reason..."
                    value={reviewNotes[artwork.id] || ''}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({
                        ...prev,
                        [artwork.id]: e.target.value
                      }))
                    }
                    style={{
                      width: '100%',
                      borderRadius: '12px',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  />
                </label>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="button primary"
                    disabled={loadingId === artwork.id}
                    onClick={() => updateStatus(artwork.id, 'APPROVED')}
                  >
                    {loadingId === artwork.id ? 'Saving...' : 'Approve to Public Review'}
                  </button>

                  <button
                    className="button secondary"
                    disabled={loadingId === artwork.id}
                    onClick={() => updateStatus(artwork.id, 'REJECTED')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}