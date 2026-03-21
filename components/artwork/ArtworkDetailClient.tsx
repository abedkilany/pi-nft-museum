'use client';

import { useEffect, useState } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { piApiFetch } from '@/lib/pi-auth-client';
import type { ArtworkDetailDto, ArtworkViewerStateDto } from '@/lib/artwork-detail';
import ArtworkDetailContent from '@/components/artwork/ArtworkDetailContent';

const guestViewer: ArtworkViewerStateDto = {
  authenticated: false,
  userId: null,
  role: null,
  isOwner: false,
  canReport: false,
  canComment: false,
  canModerate: false,
  canHide: false,
  paymentDisabled: true,
  paymentDisabledReason: 'Connect with Pi first to test payments.',
};

export default function ArtworkDetailClient({
  artwork,
  initialViewer,
}: {
  artwork: ArtworkDetailDto;
  initialViewer: ArtworkViewerStateDto;
}) {
  const { status } = usePiAuth();
  const [viewer, setViewer] = useState<ArtworkViewerStateDto>(initialViewer);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (status !== 'authenticated') {
        setViewer(guestViewer);
        return;
      }

      const response = await piApiFetch(`/api/artworks/viewer-state?id=${artwork.id}`, {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);

      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;
      if (!response?.ok || !payload?.ok || !payload?.viewer) return;

      setViewer(payload.viewer as ArtworkViewerStateDto);
    }

    void load();
    return () => { cancelled = true; };
  }, [artwork.id, status]);

  return <ArtworkDetailContent artwork={artwork} viewer={viewer} />;
}
