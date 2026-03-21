'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ensurePiUserSession, getPiAuthHeaders } from '@/lib/pi-auth-client';

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
      let payload: AuthMePayload | null = null;

      try {
        const tokenCheck = await fetch('/api/auth/me', {
          method: 'GET',
          headers: getPiAuthHeaders(),
          cache: 'no-store',
        }).catch(() => null);
        payload = tokenCheck ? await tokenCheck.json().catch(() => null) : null;

        if (!tokenCheck?.ok || !payload?.authenticated) {
          payload = await ensurePiUserSession(['username', 'payments']);
        }
      } catch {
        router.replace('/login');
        return;
      }

      if (cancelled) return;

      if (payload?.ok && payload?.authenticated && payload?.user?.username) {
        router.replace(`/profile/${payload.user.username}`);
        return;
      }

      router.replace('/login');
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
