'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EditArtworkForm } from '@/components/account/EditArtworkForm';
import { piApiFetch } from '@/lib/pi-auth-client';

export default function EditArtworkPage() {
  const params = useParams<{ id: string }>();
  const artworkId = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!artworkId) {
        setError('Invalid artwork id.');
        setLoading(false);
        return;
      }
      const response = await piApiFetch(`/api/account/artworks/${artworkId}`, { method: 'GET', cache: 'no-store' }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;
      if (response?.status === 403) {
        router.replace('/artwork');
        return;
      }
      if (response?.status === 404) {
        router.replace('/artwork');
        return;
      }
      if (!response?.ok || !payload?.ok) {
        setError(payload?.error || 'Failed to load artwork.');
        setLoading(false);
        return;
      }
      setData(payload);
      setLoading(false);
    }
    if (artworkId) void load();
    else {
      setError('Invalid artwork id.');
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [artworkId, router]);

  if (loading) return <div className="container" style={{ paddingTop: '40px' }}><div className="card" style={{ padding: '24px' }}><p>Loading artwork…</p></div></div>;
  if (error || !data?.artwork) return <div className="container" style={{ paddingTop: '40px' }}><div className="card" style={{ padding: '24px' }}><p>{error || 'Unable to load artwork.'}</p></div></div>;

  const artwork = data.artwork;

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <EditArtworkForm
        artwork={{
          id: artwork.id,
          status: artwork.status,
          title: artwork.title,
          description: artwork.description,
          basePrice: Number(artwork.basePrice ?? artwork.price),
          discountPercent: Number(artwork.discountPercent ?? 0),
          price: Number(artwork.price),
          imageUrl: artwork.imageUrl,
          category: artwork.category?.name || '',
          reviewNote: artwork.reviewNote || ''
        }}
        categories={data.categories || []}
      />
    </div>
  );
}
