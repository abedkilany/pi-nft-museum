'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ensurePiUserSession } from '@/lib/pi-auth-client';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function resolveProfile() {
      const result = await ensurePiUserSession();

      if (cancelled) return;

      if (result.ok && result.authenticated && result.user?.username) {
        router.replace(`/profile/${result.user.username}`);
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
