'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { RequirePiAuth } from '@/components/auth/RequirePiAuth';
import { piApiFetch } from '@/lib/pi-auth-client';

export default function ProfilePage() {
  const router = useRouter();
  const { user, status } = usePiAuth();
  const [message, setMessage] = useState('Opening your profile…');

  useEffect(() => {
    let cancelled = false;

    async function openProfile() {
      if (status !== 'authenticated') return;

      if (user?.username) {
        router.replace(`/profile/${user.username}`);
        return;
      }

      setMessage('Finishing your profile lookup…');
      const response = await piApiFetch('/api/profile/me', {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;

      const resolvedUsername = payload?.user?.username;
      if (response?.ok && resolvedUsername) {
        router.replace(`/profile/${resolvedUsername}`);
        return;
      }

      setMessage(payload?.error || 'We could not open your profile automatically. Please open Account settings and complete your profile.');
    }

    void openProfile();
    return () => {
      cancelled = true;
    };
  }, [router, status, user?.username]);

  return (
    <RequirePiAuth loadingText="Opening your profile…">
      <div className="page-stack">
        <section className="card surface-section">
          <p>{message}</p>
        </section>
      </div>
    </RequirePiAuth>
  );
}
