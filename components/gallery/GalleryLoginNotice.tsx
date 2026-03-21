'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PiConnectButton } from '@/components/PiConnectButton';
import { piApiFetch } from '@/lib/pi-auth-client';

type Props = {
  initiallyAuthenticated: boolean;
};

type Status = 'checking' | 'authenticated' | 'guest';

export function GalleryLoginNotice({ initiallyAuthenticated }: Props) {
  const router = useRouter();
  const refreshedAfterAuth = useRef(false);
  const [status, setStatus] = useState<Status>(
    initiallyAuthenticated ? 'authenticated' : 'checking'
  );

  useEffect(() => {
    if (initiallyAuthenticated) {
      setStatus('authenticated');
      return;
    }

    let cancelled = false;

    async function resolveAuth() {
      const response = await piApiFetch('/api/auth/me', {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);

      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;

      if (response?.ok && payload?.authenticated) {
        setStatus('authenticated');

        if (!refreshedAfterAuth.current) {
          refreshedAfterAuth.current = true;
          router.refresh();
        }
        return;
      }

      setStatus('guest');
    }

    void resolveAuth();

    return () => {
      cancelled = true;
    };
  }, [initiallyAuthenticated, router]);

  if (status === 'authenticated') {
    return null;
  }

  if (status === 'checking') {
    return (
      <section className="card surface-section">
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Checking your Pi session...
        </p>
      </section>
    );
  }

  return (
    <section className="card surface-section">
      <div className="card-actions" style={{ marginTop: 0 }}>
        <p style={{ margin: 0 }}>
          You can browse artworks freely. Log in with Pi to react.
        </p>
        <PiConnectButton className="button primary" redirectTo="/gallery">
          Connect with Pi
        </PiConnectButton>
      </div>
    </section>
  );
}
