'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequirePiAuth } from '@/components/auth/RequirePiAuth';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

export default function ArtworkPage() {
  const router = useRouter();
  const { status } = usePiAuth();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/account/artworks');
    }
  }, [router, status]);

  return (
    <RequirePiAuth loadingText="Opening your artworks…">
      <div className="page-stack"><section className="card surface-section"><p>Opening your artworks…</p></section></div>
    </RequirePiAuth>
  );
}
