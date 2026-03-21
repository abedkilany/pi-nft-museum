'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { piApiFetch } from '@/lib/pi-auth-client';

type AuthMePayload = {
  ok?: boolean;
  authenticated?: boolean;
  user?: {
    username?: string | null;
  } | null;
};

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function resolveProfile() {
      const response = await piApiFetch('/api/auth/me', {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);

      const payload: AuthMePayload | null = response
        ? await response.json().catch(() => null)
        : null;

      if (cancelled) return;

      if (response?.ok && payload?.ok && payload?.authenticated && payload?.user?.username) {
        router.replace(`/profile/${payload.user.username}`);
        return;
      }

      if (response?.status === 401) {
        router.replace('/login');
        return;
      }

      router.replace('/');
    }

    void resolveProfile();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="page-stack">
      <section className="card surface-section">
        <p>Opening your profile…</p>
      </section>
    </div>
  );
}
