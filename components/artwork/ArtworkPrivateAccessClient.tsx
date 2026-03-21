'use client';

import { useEffect, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { piApiFetch } from '@/lib/pi-auth-client';
import type { ArtworkDetailDto, ArtworkViewerStateDto } from '@/lib/artwork-detail';
import ArtworkDetailContent from '@/components/artwork/ArtworkDetailContent';

type Payload = {
  artwork: ArtworkDetailDto;
  viewer: ArtworkViewerStateDto;
};

export default function ArtworkPrivateAccessClient({ artworkId }: { artworkId: number }) {
  const { status } = usePiAuth();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      const response = await piApiFetch(`/api/artworks/private-view?id=${artworkId}`, {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);

      const data = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;

      if (response?.ok && data?.ok && data?.artwork && data?.viewer) {
        setPayload({ artwork: data.artwork, viewer: data.viewer });
        setLoading(false);
        return;
      }

      if (response?.status === 401) {
        setError('Connect with Pi to open this artwork.');
      } else if (response?.status === 403 || response?.status === 404) {
        setError('This artwork is not publicly available.');
      } else {
        setError(data?.error || 'Unable to open this artwork.');
      }
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [artworkId, status]);

  if (loading) {
    return <div className="page-stack"><section className="card surface-section"><p>Checking artwork access…</p></section></div>;
  }

  if (!payload) {
    return <div className="page-stack"><section className="card surface-section"><p>{error}</p></section></div>;
  }

  return <ArtworkDetailContent artwork={payload.artwork} viewer={payload.viewer} />;
}
