'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/account');
  }, [router]);

  return (
    <div style={{ paddingTop: '30px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <p>Redirecting to your account…</p>
      </section>
    </div>
  );
}
